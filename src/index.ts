import bs58 from "bs58";

import * as anchor from '@project-serum/anchor';
import { BorshInstructionCoder } from '@project-serum/anchor/dist/cjs/coder/borsh/instruction';

export type AccountDescription = {
    publicKey: anchor.web3.PublicKey,
    name: string,
    isMut: boolean,
    isSigner: boolean
};

export type InstructionDescription = {
    accounts: AccountDescription[],
    data: object,
    name: string
};

export async function fetchTransaction(
    conn: anchor.web3.Connection,
    txId: string
): Promise<anchor.web3.ParsedTransactionWithMeta | null> {
    await conn.confirmTransaction(txId);
    const txInfo = await conn.getParsedTransaction(txId, 'confirmed');
    return txInfo;
}

function parseInstruction(
    program: anchor.Program<any>,
    ixInfo: anchor.web3.PartiallyDecodedInstruction
): InstructionDescription {
    const coder = new BorshInstructionCoder(program.idl);
    const ix = coder.decode(bs58.decode(ixInfo.data));

    if (!ix) {
        throw Error('failed to decode instruction');
    }

    const foundIx = program.idl.instructions.find((i) => i.name === ix.name);
    const accounts = foundIx.accounts.map((acc, idx) =>
        Object.assign({ publicKey: ixInfo.accounts[idx] }, acc)
    );
    const ixDesc = Object.assign({ accounts }, ix);

    return ixDesc;
}

export async function parseTransaction(
    txInfo: anchor.web3.ParsedTransactionWithMeta,
    programs: anchor.Program<any>[]
): Promise<InstructionDescription[]> {
    const descriptions: InstructionDescription[] = [];

    for (const ix of txInfo.transaction.message.instructions) {
        if (ix.hasOwnProperty('parsed')) {
            const ixParsed = (ix as anchor.web3.ParsedInstruction).parsed;
            switch (ixParsed.type) {
                case 'createAccount': {
                    descriptions.push({
                        accounts: [
                            {
                                publicKey: new anchor.web3.PublicKey(ixParsed.info.newAccount),
                                name: 'newAccount',
                                isMut: true,
                                isSigner: true
                            },
                            {
                                publicKey: new anchor.web3.PublicKey(ixParsed.info.owner),
                                name: 'owner',
                                isMut: false,
                                isSigner: false
                            },
                            {
                                publicKey: new anchor.web3.PublicKey(ixParsed.info.source),
                                name: 'source',
                                isMut: true,
                                isSigner: true,
                            }
                        ],
                        data: {
                            lamports: ixParsed.info.lamports,
                            space: ixParsed.info.space,
                        },
                        name: 'createAccount'
                    });
                    break;
                }
                default: {
                    console.log(ixParsed);
                    throw Error('unknown parsed instruction');
                }
            }
        } else {
            const correspondingProgram = programs.find((p) => p.programId.equals(ix.programId));
            if (!correspondingProgram) {
                throw Error('unknown program');
            }
            const ixInfo = parseInstruction(correspondingProgram, ix as anchor.web3.PartiallyDecodedInstruction);
            descriptions.push(ixInfo);
        }
    }

    return descriptions;
}
