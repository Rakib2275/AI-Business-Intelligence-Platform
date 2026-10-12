const CART_STORAGE_KEY = "noviq:cart";
const CART_UPDATED_EVENT = "noviq:cart-updated";

export function getCartProductIds(): string[] {
	const savedCart: unknown = JSON.parse(
		window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]",
	);
	if (!Array.isArray(savedCart)) {
		throw new TypeError("Saved cart must be an array.");
	}
	return [
		...new Set(savedCart.filter((item): item is string => typeof item === "string")),
	];
}

function saveCartProductIds(productIds: string[]) {
	window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(productIds));
	window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function addCartProduct(productId: string): string[] {
	const productIds = getCartProductIds();
	if (!productIds.includes(productId)) {
		productIds.push(productId);
		saveCartProductIds(productIds);
	}
	return productIds;
}

export function removeCartProduct(productId: string): string[] {
	const productIds = getCartProductIds().filter((id) => id !== productId);
	saveCartProductIds(productIds);
	return productIds;
}

export function clearCart(): void {
	saveCartProductIds([]);
}

export const cartUpdatedEvent = CART_UPDATED_EVENT;
