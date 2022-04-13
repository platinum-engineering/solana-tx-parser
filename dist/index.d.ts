import * as anchor from '@project-serum/anchor';
export declare type AccountDescription = {
    publicKey: anchor.web3.PublicKey;
    name: string;
    isMut: boolean;
    isSigner: boolean;
};
export declare type InstructionDescription = {
    accounts: AccountDescription[];
    data: object;
    name: string;
};
export declare function fetchTransaction(conn: anchor.web3.Connection, txId: string): Promise<anchor.web3.ParsedTransactionWithMeta | null>;
export declare function parseTransaction(txInfo: anchor.web3.ParsedTransactionWithMeta, programs: anchor.Program<any>[]): Promise<InstructionDescription[]>;
//# sourceMappingURL=index.d.ts.map