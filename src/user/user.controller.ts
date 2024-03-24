import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  Req,
} from '@nestjs/common';
import * as bip39 from 'bip39';
import * as crypto from 'crypto';
import * as elliptic from 'elliptic';
import { UserService, Transaction } from './user.service';
import axios from 'axios'; // Import axios directly

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body('password') password: string): Promise<any> {
    const mnemonic = bip39.generateMnemonic();
    const ec = new elliptic.ec('secp256k1');
    const keyPair = ec.genKeyPair();
    const publicKey = keyPair.getPublic('hex');
    const privateKey = keyPair.getPrivate('hex');

    const user = await this.userService.create({
      passPhrase: mnemonic,
      publicKey,
      privateKey,
      password,
    });

    return {
      mnemonic,
      publicKey: user.publicKey,
      password: user.password,
      privateKey: user.privateKey,
    };
  }

  @Post('import')
  async import(
    @Body('passPhrase') passPhrase: string,
    @Body('password') password: string,
  ): Promise<any> {
    const user = await this.userService.findByPassPhrase(passPhrase);
    if (!user) {
      throw new UnauthorizedException('Invalid passphrase');
    }

    user.password = password;

    await this.userService.update(user);

    return {
      publicKey: user.publicKey,
      privateKey: user.privateKey,
      password: user.password,
    };
  }

  @Get('privateKey')
  async getPrivateKey(@Req() request): Promise<any> {
    const { passPhrase, password } = request.body;

    const user = await this.userService.findByPassPhrase(passPhrase);
    if (!user || user.password !== password) {
      throw new UnauthorizedException('Invalid passphrase or password');
    }

    return {
      privateKey: user.privateKey,
    };
  }

  @Post('transaction')
  async transaction(
    @Body('senderPrivateKey') senderPrivateKey: string,
    @Body('senderPublicKey') senderPublicKey: string,
    @Body('senderPassword') senderPassword: string,
    @Body('receiverPublicKey') receiverPublicKey: string,
    @Body('value') value: number,
  ): Promise<any> {
    try {
      const sender = await this.userService.findByPublicKey(senderPublicKey);
      if (!sender) {
        throw new UnauthorizedException('Sender not found');
      } else if (sender.password !== senderPassword) {
        throw new UnauthorizedException('Sender password do not match');
      }

      const ec = new elliptic.ec('secp256k1');
      const keyPair = ec.keyFromPrivate(senderPrivateKey);
      const calculatedPublicKey = keyPair.getPublic('hex');
      if (senderPublicKey !== calculatedPublicKey) {
        throw new UnauthorizedException('Invalid private key for the sender');
      }

      if (sender.balance < value) {
        throw new Error('Insufficient balance');
      }

      const receiver =
        await this.userService.findByPublicKey(receiverPublicKey);
      if (!receiver) {
        throw new Error('Receiver not found');
      }

      const transactionAction = `Transfer ${value} DCL value to ${receiverPublicKey}`;
      const timestamp = Date.now();
      const transactionHash = crypto
        .createHash('sha256')
        .update(
          `${transactionAction}${senderPublicKey}${receiverPublicKey}${value}${timestamp}`,
        )
        .digest('hex');

      const signature = keyPair.sign(transactionHash).toDER('hex');

      const transaction: Transaction = {
        status: 'pending',
        block: -1,
        timestamp,
        transactionAction,
        from: senderPublicKey,
        to: receiverPublicKey,
        value,
        transactionFee: 0,
        gasPrice: 0,
        transactionHash,
        signature,
      };

      await this.postTransaction(transaction);

      sender.balance -= value;
      await this.userService.update(sender);

      receiver.balance += value;
      await this.userService.update(receiver);

      return {
        message: 'Transaction successful',
        senderBalance: sender.balance,
        receiverBalance: receiver.balance,
        transaction,
      };
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  async postTransaction(transaction): Promise<void> {
    try {
      const response = await axios.post(
        'http://192.168.0.142:3000/transaction',
        transaction,
      );
      console.log('Transaction broadcasted:', response.data);

      const isSignatureValid = await this.validateSignature(transaction);
      console.log('Signature is valid:', isSignatureValid);
    } catch (error) {
      console.error('Failed to broadcast transaction:', error);
      throw new Error('Failed to broadcast transaction');
    }
  }

  async validateSignature(transaction): Promise<boolean> {
    try {
      const ec = new elliptic.ec('secp256k1'); // Instantiate elliptic.ec
      let key = ec.keyFromPublic(transaction.from, 'hex');
      return key.verify(transaction.transactionHash, transaction.signature);
    } catch (error) {
      console.error('Failed to validate signature:', error);
      return false;
    }
  }
}
