import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { ProductType } from './entities/product-type.entity';

@Injectable()
export class ProductTypesService {
  constructor(
    @InjectRepository(ProductType)
    private readonly productTypeRepository: Repository<ProductType>,
  ) {}

  async findAll(): Promise<ProductType[]> {
    return await this.productTypeRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ProductType> {
    const productType = await this.productTypeRepository.findOne({
      where: { id },
    });

    if (!productType) {
      throw new NotFoundException('Product type not found');
    }

    return productType;
  }

  async create(dto: CreateProductTypeDto): Promise<ProductType> {
    const existingProductType = await this.productTypeRepository.findOne({
      where: { code: dto.code },
    });

    if (existingProductType) {
      throw new BadRequestException('Product type already exists');
    }

    const productType = this.productTypeRepository.create({
      code: dto.code,
      name: dto.name,
    });

    return await this.productTypeRepository.save(productType);
  }

  async update(id: number, dto: UpdateProductTypeDto): Promise<ProductType> {
    const productType = await this.findOne(id);

    if (dto.code) {
      const existingProductType = await this.productTypeRepository.findOne({
        where: { code: dto.code, id: Not(id) },
      });

      if (existingProductType) {
        throw new BadRequestException('Product type already exists');
      }
    }

    this.productTypeRepository.merge(productType, dto);

    return await this.productTypeRepository.save(productType);
  }
}
