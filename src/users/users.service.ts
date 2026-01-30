import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { FindOneOptions, Repository } from 'typeorm';
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

  async findUserByEmail(email: string, isExtended: boolean = false) {
    const options: FindOneOptions<User> = {
      where: { email },
    };
    if (isExtended) {
      options.relations = {
        userRoles: { role: true },
      };
    }
    return await this.usersRepository.findOne(options);
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
      user_id: userId,
      activation_link: activationLink,
      expiration_date: expirationDate,
      created_at: new Date(),
    });

    return this.userActivationLinkRepository.save(activationLinkResult);
  }

  async activate(token: string) {
    console.log('try to activate user (service)');

    const record = await this.userActivationLinkRepository.findOne({
      where: { activation_link: token },
    });

    console.log('record:', record);

    if (!record) {
      console.log('record not found');
      throw new Error('Activation link not found');
    }

    if (record.usedAt) {
      throw new Error('Link already used');
    }

    if (record.expiration_date < new Date()) throw new Error('Link expired');

    /* Find status ID of 'verified' */
    const statusData = await this.userStatusRepository.findOne({
      where: { name: 'verified' },
    });

    if (!statusData) throw new Error('Status not found');

    /* Update user status */
    await this.usersRepository.update(record.user_id, {
      status: statusData,
    });

    /* Deactivate token */
    await this.userActivationLinkRepository.update(
      { id: record.id },
      { usedAt: new Date() },
    );

    return { success: true };
  }
}
