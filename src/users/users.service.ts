import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserStatus } from './entities/user-status.entity';
import { UserActivationLink } from './entities/user-activation-links.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(UserStatus)
    private readonly userStatusRepository: Repository<UserStatus>,

    @InjectRepository(UserActivationLink)
    private readonly userActivationLinkRepository: Repository<UserActivationLink>,
  ) {}

  // TODO delete
  async getUserName(userId: number) {
    const user = await this.usersRepository.find({ where: { id: userId } });
    console.log('user data:', user);
    const result = user;
    return result;
  }

  async findUserByEmail(email: string) {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async addNewUser(dto: RegisterUserDto): Promise<User> {
    /* Find inactive status */
    const inactiveStatus = await this.userStatusRepository.findOne({
      where: { name: 'inactive' },
    });
    if (!inactiveStatus) throw new Error('Inactive status not found');
    const user = this.usersRepository.create({
      email: dto.email,
      nickname: dto.nickname,
      password: dto.password,
      status: inactiveStatus,
    });

    return this.usersRepository.save(user);
  }

  async addNewUserActivationLink(userId: number, activationLink: string) {
    /* Generate expiration date */
    const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
    const activationLinkResult = this.userActivationLinkRepository.create({
      user: { id: userId } as User,
      activation_link: activationLink,
      expiration_date: expirationDate,
      created_at: new Date(),
    });

    return this.userActivationLinkRepository.save(activationLinkResult);
  }
}
