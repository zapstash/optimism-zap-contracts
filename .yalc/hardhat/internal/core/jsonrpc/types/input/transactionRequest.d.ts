/// <reference types="node" />
import * as t from "io-ts";
export declare const rpcTransactionRequest: t.TypeC<{
    from: t.Type<Buffer, Buffer, unknown>;
    to: t.Type<Buffer | undefined, Buffer | undefined, unknown>;
    gas: t.Type<import("bn.js") | undefined, import("bn.js") | undefined, unknown>;
    gasPrice: t.Type<import("bn.js") | undefined, import("bn.js") | undefined, unknown>;
    value: t.Type<import("bn.js") | undefined, import("bn.js") | undefined, unknown>;
    nonce: t.Type<import("bn.js") | undefined, import("bn.js") | undefined, unknown>;
    data: t.Type<Buffer | undefined, Buffer | undefined, unknown>;
    accessList: t.Type<{
        address: Buffer;
        storageKeys: Buffer[];
    }[] | undefined, {
        address: Buffer;
        storageKeys: Buffer[];
    }[] | undefined, unknown>;
    chainId: t.Type<import("bn.js") | undefined, import("bn.js") | undefined, unknown>;
}>;
export interface RpcTransactionRequestInput {
    from: string;
    to?: string;
    gas?: string;
    gasPrice?: string;
    value?: string;
    nonce?: string;
    data?: string;
}
export declare type RpcTransactionRequest = t.TypeOf<typeof rpcTransactionRequest>;
//# sourceMappingURL=transactionRequest.d.ts.map