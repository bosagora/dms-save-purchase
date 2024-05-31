export interface IShopData {
    shopId: string;
    name: string;
    address: string;
    privateKey: string;
}

export interface IUserData {
    idx: number;
    phone: string;
    address: string;
    privateKey: string;
}

export interface IProductData {
    productId: string;
    amount: number;
    providerPercent: number;
}

export interface INewPurchaseDetails {
    productId: string;
    amount: number;
    providePercent: number;
}

export interface INewPurchaseData {
    purchaseId: string;
    timestamp: string;
    totalAmount: number;
    cashAmount: number;
    currency: string;
    shopId: string;
    waiting: number;
    userAccount: string;
    userPhone: string;
    details: INewPurchaseDetails[];
}

export interface ICancelPurchaseData {
    purchaseId: string;
    timestamp: string;
}

export interface IProducts {
    product: IProductData;
    count: number;
}
