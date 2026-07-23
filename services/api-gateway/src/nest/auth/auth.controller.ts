import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsNotEmpty, IsString } from 'class-validator';
import { DEMO_USERS } from './demo-users';

export class LoginRequestDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginRequestDto) {
    const user = DEMO_USERS.find(
      (candidate) => candidate.username === dto.username && candidate.password === dto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.jwtService.signAsync({
      sub: user.id,
      name: user.name,
      role: user.role,
    });
    return {
      data: {
        token,
        user: { id: user.id, name: user.name, role: user.role },
      },
    };
  }
}
