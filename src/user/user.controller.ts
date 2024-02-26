import { Controller, Post, Body } from '@nestjs/common';
import * as bip39 from 'bip39';
import * as elliptic from 'elliptic';
import { UserService } from './user.service';
import { register } from 'module';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post('register')
  async register(): Promise<any> {
    const mnemonic = bip39.generateMnemonic();
    const ec = new elliptic.ec('secp256k1');
    const keyPair = ec.genKeyPair();
    const publicKey = keyPair.getPublic('hex');
    const privateKey = keyPair.getPrivate('hex');

    const user = await this.userService.create({
      passphrase: mnemonic,
      publicKey,
      privateKey,
    });

    return {
      mnemonic,
      publicKey: user.publicKey,
    };
  }
}
