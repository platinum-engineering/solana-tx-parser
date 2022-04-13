import bs58 from "bs58";
import { sha256 } from "js-sha256";
import { snakeCase } from "snake-case";
import * as anchor from '@project-serum/anchor';
import { BorshInstructionCoder } from '@project-serum/anchor/dist/cjs/coder/borsh/instruction';
// Not technically sighash, since we don't include the arguments, as Rust
// doesn't allow function overloading.
function sighash(nameSpace, ixName) {
    let name = snakeCase(ixName);
    let preimage = `${nameSpace}:${name}`;
    return Buffer.from(sha256.digest(preimage)).slice(0, 8);
}
export async function fetchTransaction(conn, txId) {
    await conn.confirmTransaction(txId);
    const txInfo = await conn.getParsedTransaction(txId, 'confirmed');
    return txInfo;
}
function parseInstruction(program, ixInfo) {
    const coder = new BorshInstructionCoder(program.idl);
    const ix = coder.decode(bs58.decode(ixInfo.data));
    if (!ix) {
        throw Error('failed to decode instruction');
    }
    const foundIx = program.idl.instructions.find((i) => i.name === ix.name);
    const accounts = foundIx.accounts.map((acc, idx) => Object.assign({ publicKey: ixInfo.accounts[idx] }, acc));
    const ixDesc = Object.assign({ accounts }, ix);
    return ixDesc;
}
export async function parseTransaction(txInfo, programs) {
    const descriptions = [];
    for (const ix of txInfo.transaction.message.instructions) {
        if (ix.hasOwnProperty('parsed')) {
            const ixParsed = ix.parsed;
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
        }
        else {
            const correspondingProgram = programs.find((p) => p.programId.equals(ix.programId));
            if (!correspondingProgram) {
                throw Error('unknown program');
            }
            const ixInfo = parseInstruction(correspondingProgram, ix);
            descriptions.push(ixInfo);
        }
    }
    return descriptions;
}
//# sourceMappingURL=index.js.map