export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
  image?: string;
}
