"""자주 쓰는 계좌 라우터 (TR-004)."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends

from ..logging_setup import mask_account_no
from ..schema.transfer import (
    FavoriteAccountCreate,
    FavoriteAccountItem,
    FavoriteAccountUpdate,
)
from ..service.auth import CurrentCustomer, current_customer
from ..service.favorite_account import (
    create_favorite,
    delete_favorite,
    list_favorites,
    update_favorite,
)

router = APIRouter(prefix="/transfer/favorites", tags=["favorite-account"])
log = structlog.get_logger("favorite_account")


def _to_item(r: dict) -> FavoriteAccountItem:
    raw = r["ACCOUNT_NO"] or ""
    return FavoriteAccountItem(
        id=int(r["FREQUENT_ACCOUNT_ID"]),
        alias=r["ALIAS"] or "",
        bank_cd=r["BANK_CD"] or "",
        account_no=raw,
        masked_account_no=mask_account_no(raw),
        account_holder_name=r["ACCOUNT_HOLDER_NAME"] or "",
        use_count=int(r["USE_COUNT"] or 0),
        last_used_at=r["LAST_USED_AT"],
    )


@router.get("", response_model=list[FavoriteAccountItem])
async def list_my_favorites(
    user: CurrentCustomer = Depends(current_customer),
) -> list[FavoriteAccountItem]:
    rows = await list_favorites(user.customer_no)
    return [_to_item(r) for r in rows]


@router.post("", response_model=FavoriteAccountItem)
async def add_favorite(
    req: FavoriteAccountCreate,
    user: CurrentCustomer = Depends(current_customer),
) -> FavoriteAccountItem:
    fav_id = await create_favorite(
        user.customer_no,
        alias=req.alias,
        bank_cd=req.bank_cd,
        account_no=req.account_no,
        account_holder_name=req.account_holder_name,
        display_order=req.display_order,
    )
    log.info("favorite_added", id=fav_id)
    return FavoriteAccountItem(
        id=fav_id,
        alias=req.alias,
        bank_cd=req.bank_cd,
        account_no=req.account_no,
        masked_account_no=mask_account_no(req.account_no),
        account_holder_name=req.account_holder_name,
        use_count=0,
        last_used_at=None,
    )


@router.patch("/{fav_id}")
async def patch_favorite(
    fav_id: int,
    req: FavoriteAccountUpdate,
    user: CurrentCustomer = Depends(current_customer),
) -> dict:
    await update_favorite(user.customer_no, fav_id, alias=req.alias)
    log.info("favorite_updated", id=fav_id)
    return {"updated": True}


@router.delete("/{fav_id}")
async def remove_favorite(
    fav_id: int,
    user: CurrentCustomer = Depends(current_customer),
) -> dict:
    await delete_favorite(user.customer_no, fav_id)
    log.info("favorite_deleted", id=fav_id)
    return {"deleted": True}