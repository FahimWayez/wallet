import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  Req,
} from '@nestjs/common';
import * as bip39 from 'bip39';
import * as elliptic from 'elliptic';
import { UserService } from './user.service';

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
      password: user.password, //shoraite hobe
      privateKey: user.privateKey, //shoraite hobe
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
      privateKey: user.privateKey, //shoraite hobe
      password: user.password, //shoraite hobe
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
    @Body('amount') amount: number,
  ): Promise<any> {
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

    if (sender.balance < amount) {
      throw new Error('Insufficient balance');
    }

    sender.balance -= amount;
    await this.userService.update(sender);

    const receiver = await this.userService.findByPublicKey(receiverPublicKey);
    if (!receiver) {
      throw new Error('Receiver not found');
    }

    receiver.balance += amount;
    await this.userService.update(receiver);

    return {
      message: 'Transaction successful',
      senderBalance: sender.balance,
      receiverBalance: receiver.balance, //shoraite hobe
    };
  }
}
