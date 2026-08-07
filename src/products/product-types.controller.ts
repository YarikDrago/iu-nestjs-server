import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { ProductTypesService } from './product-types.service';

@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly productTypesService: ProductTypesService) {}

  @Get()
  async getProductTypes() {
    return await this.productTypesService.findAll();
  }

  @Get(':id')
  async getProductType(@Param('id', ParseIntPipe) id: number) {
    return await this.productTypesService.findOne(id);
  }

  @Post()
  async createProductType(@Body() body: CreateProductTypeDto) {
    return await this.productTypesService.create(body);
  }

  @Patch(':id')
  async updateProductType(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductTypeDto,
  ) {
    return await this.productTypesService.update(id, body);
  }
}
