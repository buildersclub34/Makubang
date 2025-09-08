export type RootStackParamList = {
  MainTabs: undefined;
  VideoDetail: { videoId: string };
  Restaurant: { restaurantId: string };
  Checkout: { restaurantId: string };
  OrderTracking: { orderId: string };
  Notifications: undefined;
  Comments: { videoId: string };
  Payment: { order: any };
  Home: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  Explore: undefined;
  Orders: undefined;
  Profile: undefined;
};
