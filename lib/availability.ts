export type Availability = Pick<{ stock: number; is_available: boolean }, "stock" | "is_available">;

/** A product must be both enabled by staff and have at least one unit remaining. */
export function isProductOrderable(item: Availability) {
  return item.is_available && Number.isFinite(item.stock) && item.stock > 0;
}
