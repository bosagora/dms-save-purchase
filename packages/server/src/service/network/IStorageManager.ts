export interface IStorageManager {
    setTest(value: boolean): any;
    add(data: string | Buffer, cid: string): Promise<string>;
}
