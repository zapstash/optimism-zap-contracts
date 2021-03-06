import { BoundExperimentalHardhatNetworkMessageTraceHook } from "../../../../types";
import { HardhatNode } from "../node";
import { ForkConfig } from "../node-types";
import { ModulesLogger } from "./logger";
export declare class HardhatModule {
    private readonly _node;
    private readonly _resetCallback;
    private readonly _setLoggingEnabledCallback;
    private readonly _logger;
    private readonly _experimentalHardhatNetworkMessageTraceHooks;
    constructor(_node: HardhatNode, _resetCallback: (forkConfig?: ForkConfig) => Promise<void>, _setLoggingEnabledCallback: (loggingEnabled: boolean) => void, _logger: ModulesLogger, _experimentalHardhatNetworkMessageTraceHooks?: BoundExperimentalHardhatNetworkMessageTraceHook[]);
    processRequest(method: string, params?: any[]): Promise<any>;
    private _getStackTraceFailuresCountParams;
    private _getStackTraceFailuresCountAction;
    private _addCompilationResultParams;
    private _addCompilationResultAction;
    private _impersonateParams;
    private _impersonateAction;
    private _intervalMineParams;
    private _intervalMineAction;
    private _stopImpersonatingParams;
    private _stopImpersonatingAction;
    private _resetParams;
    private _resetAction;
    private _setLoggingEnabledParams;
    private _setLoggingEnabledAction;
    private _logBlock;
    private _runHardhatNetworkMessageTraceHooks;
}
//# sourceMappingURL=hardhat.d.ts.map