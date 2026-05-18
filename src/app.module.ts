import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './shared/config/app.config';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/user.module';
import provideGlobalAppGuards from './modules/auth/providers/global-guards.provider';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig],
    }),
    PrismaModule,
    AuthModule,
    UserModule,
  ],
  providers: [...provideGlobalAppGuards()],
})
export class AppModule {}
