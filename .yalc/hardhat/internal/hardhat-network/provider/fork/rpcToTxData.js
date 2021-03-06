"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rpcToTxData = void 0;
function rpcToTxData(rpcTransaction) {
    var _a;
    const txData = {
        gasLimit: rpcTransaction.gas,
        gasPrice: rpcTransaction.gasPrice,
        to: (_a = rpcTransaction.to) !== null && _a !== void 0 ? _a : undefined,
        nonce: rpcTransaction.nonce,
        data: rpcTransaction.input,
        v: rpcTransaction.v,
        r: rpcTransaction.r,
        s: rpcTransaction.s,
        value: rpcTransaction.value,
    };
    if (rpcTransaction.type !== undefined) {
        txData.type = rpcTransaction.type;
    }
    if (rpcTransaction.chainId !== undefined && rpcTransaction.chainId !== null) {
        txData.chainId = rpcTransaction.chainId;
    }
    if (rpcTransaction.accessList !== undefined) {
        txData.accessList = rpcTransaction.accessList.map((item) => [
            item.address,
            item.storageKeys,
        ]);
    }
    return txData;
}
exports.rpcToTxData = rpcToTxData;
//# sourceMappingURL=rpcToTxData.js.map