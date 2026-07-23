import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SystemClock } from '@radflow/ddd';
import { CreateOutboxTable1753200000001 } from '@radflow/ddd';
import { OutboxModel } from '@radflow/ddd';
import { UnitOfWorkTypeOrm } from '@radflow/ddd';
import { CreateStudyUseCase } from './core/study/application/use-cases/create-study/create-study.use-case';
import { CreateStudiesTable1753200000000 } from './core/study/infra/db/typeorm/migrations/1753200000000-create-studies-table';
import { StudyModel } from './core/study/infra/db/typeorm/study.model';
import { StudyTypeOrmRepository } from './core/study/infra/db/typeorm/study-typeorm.repository';
import { makeSeedInputs } from './seed/make-seed-inputs';

async function main(): Promise<void> {
  const count = Number(process.argv[2] ?? 20);
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgresql://radflow:radflow@localhost:5434/radflow',
    entities: [StudyModel, OutboxModel],
    migrations: [CreateStudiesTable1753200000000, CreateOutboxTable1753200000001],
    migrationsRun: true,
  });
  await dataSource.initialize();

  let created = 0;
  for (const input of makeSeedInputs(count)) {
    const unitOfWork = new UnitOfWorkTypeOrm(dataSource);
    const repository = new StudyTypeOrmRepository(dataSource, unitOfWork);
    const useCase = new CreateStudyUseCase(repository, unitOfWork, new SystemClock());
    const output = await useCase.execute(input);
    if (output.created) {
      created += 1;
    }
  }

  console.log(`Seed: ${created}/${count} studies created (existing ones were kept).`);
  await dataSource.destroy();
}

void main();
