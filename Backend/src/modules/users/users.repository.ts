import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async countUsersExceptAdmin() {
        const result = await this.usersRepository.query(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE role <> 'admin'
    `);

        return result[0].count;
    }

}