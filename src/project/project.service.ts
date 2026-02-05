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

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string) {
    const project = new this.projectModel({
      ...createProjectDto,
      createdBy: userId,
    });

    return await project.save();
  }

  async findAll(query?: {
    search?: string;
    status?: ProjectStatus;
    category?: string;
    page?: number;
    limit?: number;
  }) {
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

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const project = await this.projectModel
      .findById(id)
      .populate('createdBy', 'name email avatar')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

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
    return await project.save();
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

    return await this.projectModel.findByIdAndDelete(id).exec();
  }

  async updateMemberCount(projectId: string, increment: number) {
    return await this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $inc: { memberCount: increment } },
        { new: true },
      )
      .exec();
  }

  async updateTotalInvestment(projectId: string, amount: number) {
    return await this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $inc: { totalInvestment: amount } },
        { new: true },
      )
      .exec();
  }

  // MEMBER MANAGEMENT
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

    return await project.save();
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

    return await project.save();
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
