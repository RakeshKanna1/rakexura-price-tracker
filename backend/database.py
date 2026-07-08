import os
import json
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URI, DB_NAME

logger = logging.getLogger("rakexura-backend")
logging.basicConfig(level=logging.INFO)

from datetime import datetime

# Global database reference variables
client = None
db = None
is_mock = False

def parse_datetime(val):
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        if val.endswith('Z'):
            val = val[:-1]
        for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
            try:
                return datetime.strptime(val, fmt)
            except ValueError:
                continue
    return val

class MockCollection:
    def __init__(self, name, filepath):
        self.name = name
        self.filepath = filepath
        self._ensure_file()

    def _ensure_file(self):
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        if not os.path.exists(self.filepath):
            with open(self.filepath, 'w') as f:
                json.dump([], f)

    def _read(self):
        try:
            with open(self.filepath, 'r') as f:
                return json.load(f)
        except Exception:
            return []

    def _write(self, data):
        try:
            with open(self.filepath, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to write to mock database file {self.filepath}: {e}")

    async def find_one(self, filter, sort=None):
        cursor = await self.find(filter, sort=sort, limit=1)
        res = await cursor.to_list()
        return res[0] if res else None

    async def find(self, filter=None, sort=None, limit=None):
        data = self._read()
        results = []
        
        # Filtering
        for doc in data:
            if not filter:
                results.append(doc)
            else:
                match = True
                for k, v in filter.items():
                    if isinstance(v, dict):
                        # Simple support for operators like $gt, $lt, $in
                        doc_val = doc.get(k)
                        for op, op_val in v.items():
                            if k in ["timestamp", "created_at", "triggered_at", "last_checked"]:
                                d_val = parse_datetime(doc_val)
                                o_val = parse_datetime(op_val)
                            else:
                                d_val = doc_val
                                o_val = op_val
                            if op == "$gt" and not (d_val > o_val): match = False
                            elif op == "$lt" and not (d_val < o_val): match = False
                            elif op == "$in" and d_val not in o_val: match = False
                    elif doc.get(k) != v:
                        match = False
                if match:
                    results.append(doc)
        
        # Sorting
        if sort:
            # Sort is a list of tuples like [('timestamp', -1)]
            for key, direction in reversed(sort):
                if key in ["timestamp", "created_at", "triggered_at", "last_checked"]:
                    results.sort(key=lambda x: parse_datetime(x.get(key, 0)) if x.get(key) is not None else datetime.min, reverse=(direction == -1))
                else:
                    sample_val = None
                    for r in results:
                        if r.get(key) is not None:
                            sample_val = r.get(key)
                            break
                    if isinstance(sample_val, (int, float)):
                        results.sort(key=lambda x: x.get(key, 0) if x.get(key) is not None else 0, reverse=(direction == -1))
                    else:
                        results.sort(key=lambda x: str(x.get(key, '')) if x.get(key) is not None else "", reverse=(direction == -1))
        
        # Limiting
        if limit:
            results = results[:limit]
            
        class AsyncCursor:
            def __init__(self, items):
                self.items = items
            def __aiter__(self):
                return self
            async def __anext__(self):
                if not self.items:
                    raise StopAsyncIteration
                return self.items.pop(0)
            async def to_list(self, length=None):
                if length is not None:
                    return self.items[:length]
                return self.items
                
        return AsyncCursor(results)

    async def insert_one(self, doc):
        data = self._read()
        if "_id" not in doc:
            doc["_id"] = str(len(data) + 1)
        data.append(doc)
        self._write(data)
        
        class InsertResult:
            inserted_id = doc["_id"]
        return InsertResult()

    async def update_one(self, filter, update, upsert=False):
        data = self._read()
        found = False
        target_doc = None
        
        for doc in data:
            if all(doc.get(k) == v for k, v in filter.items()):
                target_doc = doc
                found = True
                break
        
        set_fields = update.get("$set", {})
        inc_fields = update.get("$inc", {})
        
        if found:
            target_doc.update(set_fields)
            for k, v in inc_fields.items():
                target_doc[k] = target_doc.get(k, 0) + v
        elif upsert:
            new_doc = filter.copy()
            new_doc.update(set_fields)
            for k, v in inc_fields.items():
                new_doc[k] = new_doc.get(k, 0) + v
            if "_id" not in new_doc:
                new_doc["_id"] = str(len(data) + 1)
            data.append(new_doc)
            target_doc = new_doc
            found = True
            
        if found:
            self._write(data)
            
        class UpdateResult:
            matched_count = 1 if found else 0
            modified_count = 1 if found else 0
            upserted_id = target_doc.get("_id") if (upsert and not found) else None
        return UpdateResult()

    async def delete_one(self, filter):
        data = self._read()
        initial_len = len(data)
        data = [doc for doc in data if not all(doc.get(k) == v for k, v in filter.items())]
        self._write(data)
        
        class DeleteResult:
            deleted_count = initial_len - len(data)
        return DeleteResult()
        
    async def delete_many(self, filter):
        data = self._read()
        initial_len = len(data)
        data = [doc for doc in data if not all(doc.get(k) == v for k, v in filter.items())]
        self._write(data)
        
        class DeleteResult:
            deleted_count = initial_len - len(data)
        return DeleteResult()

    async def count_documents(self, filter=None):
        data = self._read()
        if not filter:
            return len(data)
        count = 0
        for doc in data:
            if all(doc.get(k) == v for k, v in filter.items()):
                count += 1
        return count

class MockDatabase:
    def __init__(self):
        import sys
        if getattr(sys, 'frozen', False):
            # If running as packaged executable, store database in db_files next to the executable
            exe_dir = os.path.dirname(sys.executable)
            db_dir = os.path.join(exe_dir, "db_files")
            
            # If the database directory doesn't exist next to the exe, copy the bundled db files
            if not os.path.exists(db_dir):
                try:
                    import shutil
                    bundled_db_dir = os.path.join(sys._MEIPASS, "backend", "db_files")
                    if os.path.exists(bundled_db_dir):
                        shutil.copytree(bundled_db_dir, db_dir)
                        logger.info("Copied initial database files to executable folder.")
                except Exception as e:
                    logger.error(f"Failed to copy initial database: {e}")
        else:
            db_dir = os.path.join(os.path.dirname(__file__), "db_files")
            
        self.games = MockCollection("games", os.path.join(db_dir, "games.json"))
        self.price_history = MockCollection("price_history", os.path.join(db_dir, "price_history.json"))
        self.alerts = MockCollection("alerts", os.path.join(db_dir, "alerts.json"))
        self.stores = MockCollection("stores", os.path.join(db_dir, "stores.json"))
        self.logs = MockCollection("logs", os.path.join(db_dir, "logs.json"))
        self.inventory = MockCollection("inventory", os.path.join(db_dir, "inventory.json"))
        self.sales = MockCollection("sales", os.path.join(db_dir, "sales.json"))
        self.trending = MockCollection("trending", os.path.join(db_dir, "trending.json"))
        self.search_history = MockCollection("search_history", os.path.join(db_dir, "search_history.json"))

async def init_db():
    global client, db, is_mock
    if not MONGODB_URI:
        logger.warning("No MONGODB_URI environment variable set. Falling back to local JSON file database.")
        db = MockDatabase()
        is_mock = True
        return
        
    try:
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
        # Verify connection
        await client.admin.command('ping')
        db = client[DB_NAME]
        is_mock = False
        logger.info(f"Successfully connected to MongoDB database '{DB_NAME}'!")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB ({str(e)}). Falling back to local JSON file database.")
        db = MockDatabase()
        is_mock = True

def get_collection(name: str):
    global db
    if is_mock:
        return getattr(db, name)
    else:
        return db[name]
