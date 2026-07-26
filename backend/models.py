from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class PlatformPrice(BaseModel):
    store_id: str
    platform: str
    icon: str
    current_price: float
    original_price: float
    discount_percent: float
    store_link: str
    is_available: bool = True
    is_simulated: Optional[bool] = False

class GameDetail(BaseModel):
    cheapshark_id: str
    name: str
    thumbnail: str
    banner: str
    description: str
    lowest_price: float
    cheapest_ever: float
    platform_prices: List[PlatformPrice]
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class WishlistCreate(BaseModel):
    cheapshark_id: str
    name: str
    thumbnail: str

class WishlistItem(BaseModel):
    id: str = Field(alias="_id")
    cheapshark_id: str
    name: str
    thumbnail: str
    current_price: float
    lowest_ever_price: float
    last_checked: datetime

    class Config:
        populate_by_name = True

class AlertCreate(BaseModel):
    cheapshark_id: str
    game_name: str
    target_price: float
    region: Optional[str] = "IN"

class AlertItem(BaseModel):
    id: str = Field(alias="_id")
    cheapshark_id: str
    game_name: str
    target_price: float
    is_active: bool = True
    created_at: datetime

    class Config:
        populate_by_name = True

class PriceHistoryEntry(BaseModel):
    cheapshark_id: str
    game_name: str
    price: float
    timestamp: datetime

class InventoryCreate(BaseModel):
    game_name: str
    purchase_platform: str
    purchase_price: float
    quantity: int
    activation_type: str

class SaleCreate(BaseModel):
    customer_name: str
    whatsapp: str
    game_name: str
    sell_price: float
    purchase_cost: float
    payment_status: str
    delivery_status: str

class BroadcastNotificationCreate(BaseModel):
    title: str
    message: str
    short_message: Optional[str] = None
    category: Optional[str] = "Announcement"
    cheapshark_id: Optional[str] = None
    game_name: Optional[str] = None
    target: Optional[str] = "All Users"
    method: Optional[str] = "In-App Notification"
    region: Optional[str] = "IN"
