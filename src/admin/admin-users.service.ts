import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../refreshToken/refresh-token.entity';
import { UserTelegramAccounts } from '../users/entities/user-telegram-accounts.entity';
import { User } from '../users/entities/user.entity';
import { GetAdminUsersDto } from './dto/get-admin-users.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async findAll(query: GetAdminUsersDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const qb = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.status', 'status')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .distinct(true)
      .orderBy('user.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.search) {
      qb.andWhere(
        '(LOWER(user.email) LIKE :search OR LOWER(user.nickname) LIKE :search)',
        { search: `%${query.search.toLowerCase()}%` },
      );
    }

    if (query.status) {
      qb.andWhere('status.name = :status', { status: query.status });
    }

    if (query.role) {
      qb.innerJoin('user.userRoles', 'filterUserRole')
        .innerJoin('filterUserRole.role', 'filterRole')
        .andWhere('filterRole.name = :role', { role: query.role });
    }

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users.map((user) => this.toUserSummary(user)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: {
        status: true,
        userRoles: { role: true },
        telegramAccounts: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const refreshSessions = await this.refreshTokenRepository.find({
      where: { user_id: userId },
      select: {
        id: true,
        user_id: true,
        device_id: true,
        user_agent: true,
        ip_address: true,
        created_at: true,
        last_used_at: true,
        expired_at: true,
        revoked: true,
      },
      order: {
        last_used_at: 'DESC',
        created_at: 'DESC',
      },
    });

    return {
      ...this.toUserSummary(user),
      telegramAccounts: user.telegramAccounts.map((account) =>
        this.toTelegramAccount(account),
      ),
      refreshSessions: refreshSessions.map((session) => ({
        id: session.id,
        userId: session.user_id,
        deviceId: session.device_id,
        userAgent: session.user_agent,
        ipAddress: session.ip_address,
        createdAt: session.created_at,
        lastUsedAt: session.last_used_at,
        expiredAt: session.expired_at,
        revoked: session.revoked,
      })),
    };
  }

  private toUserSummary(user: User) {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      status: user.status?.name ?? null,
      roles: (user.userRoles ?? []).map((userRole) => userRole.role.name),
    };
  }

  private toTelegramAccount(account: UserTelegramAccounts) {
    return {
      id: account.id,
      telegramUserId: account.telegramUserId,
      username: account.username,
      firstName: account.firstName,
      lastName: account.lastName,
      chatId: account.chatId,
      linkedAt: account.linkedAt,
    };
  }
}
