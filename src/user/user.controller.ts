import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import * as bip39 from 'bip39';
import * as elliptic from 'elliptic';
import { UserService } from './user.service';

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
      passPhrase: mnemonic,
      publicKey,
      privateKey,
    });

    return {
      mnemonic,
      publicKey: user.publicKey,
    };
  }

  @Post('import')
  async import(@Body('passPhrase') passPhrase: string): Promise<any> {
    const user = await this.userService.findByPassPhrase(passPhrase);
    if (!user) {
      throw new UnauthorizedException('Invalid passphrase');
    }

    return {
      publicKey: user.publicKey,
      privateKey: user.privateKey,
    };
  }
}
