import 'reflect-metadata';
import { plainToInstance, Transform } from 'class-transformer';
import { IsOptional, IsBoolean } from 'class-validator';

class Dto {
  @IsOptional()
  @Transform(({ value }) => {
    console.log("Transform value:", value);
    return value === true || value === 'true';
  })
  @IsBoolean()
  duplicateOnly?: boolean;
}

const obj1 = { duplicateOnly: 'false' };
const obj2 = {};

console.log("Obj1:", plainToInstance(Dto, obj1));
console.log("Obj2:", plainToInstance(Dto, obj2));
