import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getUserName(userId: number) {
    const user = await this.usersRepository.find({ where: { id: userId } });
    console.log('user data:', user);
    const result = user;
    return result;
  }
}
