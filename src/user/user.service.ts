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
      password: newUser.password,
      balance: 1000,
    };

    this.users.push(user);
    return user;
  }

  async findByPassPhrase(passPhrase: string): Promise<User | undefined> {
    return this.users.find((user) => user.passPhrase === passPhrase);
  }

  async update(user: User): Promise<void> {
    await db.put(user.id.toString(), user);
  }

  async findByPublicKey(publicKey: string): Promise<User | undefined> {
    return this.users.find((user) => user.publicKey === publicKey);
  }
}

interface User {
  id: number;
  passPhrase: string;
  publicKey: string;
  privateKey: string;
  password: string;
  balance: number;
}

interface CreateUserDto {
  passPhrase: string;
  publicKey: string;
  privateKey: string;
  password: string;
}
