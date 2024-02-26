import { Injectable } from '@nestjs/common';

var { Level } = require('level');
var db = new Level('./userdb', { valueEncoding: 'json' });

@Injectable()
export class UserService {
  private readonly users: User[] = [];

  async create(newUser: CreateUserDto): Promise<User> {
    const user: User = {
      id: this.users.length + 1,
      passPhrase: newUser.passPhrase,
      publicKey: newUser.publicKey,
      privateKey: newUser.privateKey,
    };

    this.users.push(user);
    return user;
  }

  async findByPassPhrase(passPhrase: string): Promise<User | undefined> {
    return this.users.find((user) => user.passPhrase === passPhrase);
  }
}

interface User {
  id: number;
  passPhrase: string;
  publicKey: string;
  privateKey: string;
}

interface CreateUserDto {
  passPhrase: string;
  publicKey: string;
  privateKey: string;
}
