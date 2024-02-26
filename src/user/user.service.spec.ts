// import { Test, TestingModule } from '@nestjs/testing';
// import { UserService } from './user.service';
import { Injectable } from '@nestjs/common';

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

// describe('UserService', () => {
//   let service: UserService;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [UserService],
//     }).compile();

//     service = module.get<UserService>(UserService);
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });
// });
