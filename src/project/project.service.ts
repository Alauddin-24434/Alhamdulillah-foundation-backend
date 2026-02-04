import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectStatus } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    private readonly redisService: RedisService,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string) {
    const project = new this.projectModel({
      ...createProjectDto,
      createdBy: userId,
    });

    const saved = await project.save();
    // 🧹 Invalidate list cache
    await this.redisService.delPattern('projects:all*');
    return saved;
  }

  async findAll(query?: {
    search?: string;
    status?: ProjectStatus;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    // 🔍 Check Cache
    const cacheKey = `projects:all:${JSON.stringify(query)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const { search, status, category, page = 1, limit = 10 } = query || {};
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.projectModel.countDocuments(filter).exec(),
    ]);

    const result = {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // 💾 Set Cache (TTL 5 mins)
    await this.redisService.set(cacheKey, result, 300);

    return result;
  }

  async findOne(id: string) {
    // 🔍 Check Cache
    const cacheKey = `projects:${id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const project = await this.projectModel
      .findById(id)
      .populate('createdBy', 'name email avatar')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 💾 Set Cache
    await this.redisService.set(cacheKey, project, 600); // 10 mins

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string) {
    const project = await this.projectModel.findById(id);

    if (!project) {
        throw new NotFoundException('Project not found');
    }

    // Only creator or super admin can update
    if (project.createdBy.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this project',
      );
    }

    Object.assign(project, updateProjectDto);
    const updated = await project.save();

    // 🧹 Invalidate Cache
    await this.redisService.del(`projects:${id}`);
    await this.redisService.delPattern('projects:all*');

    return updated;
  }

  async remove(id: string, userId: string) {
    const project = await this.projectModel.findById(id);

    if (!project) {
        throw new NotFoundException('Project not found');
    }

    // Only creator or super admin can delete
    if (project.createdBy.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this project',
      );
    }

    const deleted = await this.projectModel.findByIdAndDelete(id).exec();
    
    // 🧹 Invalidate Cache
    await this.redisService.del(`projects:${id}`);
    await this.redisService.delPattern('projects:all*');

    return deleted;
  }

  async updateMemberCount(projectId: string, increment: number) {
    const updated = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $inc: { memberCount: increment } },
        { new: true },
      )
      .exec();
    
    // 🧹 Invalidate Cache
    if(updated) {
        await this.redisService.del(`projects:${projectId}`);
        await this.redisService.delPattern('projects:all*');
    }
    return updated;
  }

  async updateTotalInvestment(projectId: string, amount: number) {
    const updated = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $inc: { totalInvestment: amount } },
        { new: true },
      )
      .exec();
    
    // 🧹 Invalidate Cache
    if(updated) {
        await this.redisService.del(`projects:${projectId}`);
         // Investment changes might change ranking
        await this.redisService.delPattern('projects:all*');
    }
    return updated;
  }

  // 👥 MEMBER MANAGEMENT
  async addMember(projectId: string, memberData: any) {
    const project = await this.projectModel.findById(projectId);
    
    if (!project) {
        throw new NotFoundException('Project not found');
    }

    // Check if user already member
    const alreadyMember = project.members.some(
      (m: any) => m.user.toString() === memberData.user,
    );
    if (alreadyMember) {
      throw new ForbiddenException('User is already a member of this project');
    }

    project.members.push(memberData);
    project.memberCount = project.members.length;

    const saved = await project.save();

    // 🧹 Invalidate Cache
    await this.redisService.del(`projects:${projectId}`);
    await this.redisService.delPattern('projects:all*');

    return saved;
  }

  async removeMember(projectId: string, userId: string) {
    const project = await this.projectModel.findById(projectId);
    
    if (!project) {
        throw new NotFoundException('Project not found');
    }

    project.members = project.members.filter(
      (m: any) => m.user.toString() !== userId,
    );
    project.memberCount = project.members.length;

    const saved = await project.save();

    // 🧹 Invalidate Cache
    await this.redisService.del(`projects:${projectId}`);
    await this.redisService.delPattern('projects:all*');

    return saved;
  }

  async getMembers(projectId: string) {
    const project = await this.projectModel
      .findById(projectId)
      .populate('members.user', 'name email avatar phone')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project.members;
  }
}
