import { AppDataSource } from '../config/database';
import { ForumPost } from '../models/ForumPost';
import { ForumReply } from '../models/ForumReply';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../models/User';

export class ForumService {
  private postRepository = AppDataSource.getRepository(ForumPost);
  private replyRepository = AppDataSource.getRepository(ForumReply);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Get all forum posts with pagination
   */
  async getPosts(page: number = 1, limit: number = 20, sortBy: 'latest' | 'pinned' = 'latest') {
    const skip = (page - 1) * limit;

    let query = this.postRepository.createQueryBuilder('post');

    if (sortBy === 'pinned') {
      query = query.orderBy('post.isPinned', 'DESC').addOrderBy('post.createdAt', 'DESC');
    } else {
      query = query.orderBy('post.createdAt', 'DESC');
    }

    const [posts, total] = await query.skip(skip).take(limit).getManyAndCount();

    return {
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content.substring(0, 200) + (p.content.length > 200 ? '...' : ''),
        author: {
          id: p.author.id,
          name: p.author.name,
          email: p.author.email,
        },
        replyCount: p.replyCount,
        viewCount: p.viewCount,
        isPinned: p.isPinned,
        isClosed: p.isClosed,
        tags: p.tags ? JSON.parse(p.tags) : [],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single forum post with replies
   */
  async getPost(postId: string) {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['author', 'replies', 'replies.author'],
    });

    if (!post) {
      throw new AppError('Forum post not found', 404, 'POST_NOT_FOUND');
    }

    // Increment view count
    post.viewCount += 1;
    await this.postRepository.save(post);

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      author: {
        id: post.author.id,
        name: post.author.name,
        email: post.author.email,
        role: post.author.role,
      },
      replyCount: post.replyCount,
      viewCount: post.viewCount,
      isPinned: post.isPinned,
      isClosed: post.isClosed,
      tags: post.tags ? JSON.parse(post.tags) : [],
      replies: post.replies.map((r) => ({
        id: r.id,
        content: r.content,
        author: {
          id: r.author.id,
          name: r.author.name,
          email: r.author.email,
          role: r.author.role,
        },
        isMarkedAsAnswer: r.isMarkedAsAnswer,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  /**
   * Create new forum post
   */
  async createPost(userId: string, title: string, content: string, tags?: string[]) {
    if (!title || !content) {
      throw new AppError('Title and content are required', 400, 'VALIDATION_ERROR');
    }

    if (title.length < 10 || title.length > 200) {
      throw new AppError('Title must be between 10 and 200 characters', 400, 'VALIDATION_ERROR');
    }

    if (content.length < 20) {
      throw new AppError('Content must be at least 20 characters', 400, 'VALIDATION_ERROR');
    }

    const post = this.postRepository.create({
      authorId: userId,
      title,
      content,
      tags: tags ? JSON.stringify(tags) : undefined,
    });

    await this.postRepository.save(post);

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post.authorId,
      tags,
      createdAt: post.createdAt,
    };
  }

  /**
   * Update forum post (only author or admin can update)
   */
  async updatePost(postId: string, userId: string, userRole: UserRole, title?: string, content?: string) {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new AppError('Forum post not found', 404, 'POST_NOT_FOUND');
    }

    if (post.authorId !== userId && userRole !== UserRole.ADMIN) {
      throw new AppError('Only author or admin can update this post', 403, 'FORBIDDEN');
    }

    if (title && title.length < 10) {
      throw new AppError('Title must be at least 10 characters', 400, 'VALIDATION_ERROR');
    }

    if (content && content.length < 20) {
      throw new AppError('Content must be at least 20 characters', 400, 'VALIDATION_ERROR');
    }

    if (title) post.title = title;
    if (content) post.content = content;

    await this.postRepository.save(post);

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      updatedAt: post.updatedAt,
    };
  }

  /**
   * Delete forum post (only author or admin can delete)
   */
  async deletePost(postId: string, userId: string, userRole: UserRole) {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new AppError('Forum post not found', 404, 'POST_NOT_FOUND');
    }

    if (post.authorId !== userId && userRole !== UserRole.ADMIN) {
      throw new AppError('Only author or admin can delete this post', 403, 'FORBIDDEN');
    }

    await this.postRepository.remove(post);

    return { success: true, message: 'Post deleted successfully' };
  }

  /**
   * Pin/unpin forum post (admin only)
   */
  async togglePinPost(postId: string, isPinned: boolean) {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new AppError('Forum post not found', 404, 'POST_NOT_FOUND');
    }

    post.isPinned = isPinned;
    await this.postRepository.save(post);

    return { success: true, isPinned: post.isPinned };
  }

  /**
   * Close/reopen forum post (admin only)
   */
  async toggleClosePost(postId: string, isClosed: boolean) {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new AppError('Forum post not found', 404, 'POST_NOT_FOUND');
    }

    post.isClosed = isClosed;
    await this.postRepository.save(post);

    return { success: true, isClosed: post.isClosed };
  }

  /**
   * Add reply to forum post
   */
  async createReply(postId: string, userId: string, content: string) {
    if (!content || content.length < 10) {
      throw new AppError('Reply must be at least 10 characters', 400, 'VALIDATION_ERROR');
    }

    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new AppError('Forum post not found', 404, 'POST_NOT_FOUND');
    }

    if (post.isClosed) {
      throw new AppError('This post is closed and cannot receive replies', 400, 'POST_CLOSED');
    }

    const reply = this.replyRepository.create({
      postId,
      authorId: userId,
      content,
    });

    await this.replyRepository.save(reply);

    // Increment reply count
    post.replyCount += 1;
    await this.postRepository.save(post);

    return {
      id: reply.id,
      content: reply.content,
      authorId: reply.authorId,
      postId: reply.postId,
      isMarkedAsAnswer: reply.isMarkedAsAnswer,
      createdAt: reply.createdAt,
    };
  }

  /**
   * Update forum reply (only author or admin can update)
   */
  async updateReply(replyId: string, userId: string, userRole: UserRole, content: string) {
    const reply = await this.replyRepository.findOne({ where: { id: replyId } });

    if (!reply) {
      throw new AppError('Forum reply not found', 404, 'REPLY_NOT_FOUND');
    }

    if (reply.authorId !== userId && userRole !== UserRole.ADMIN) {
      throw new AppError('Only author or admin can update this reply', 403, 'FORBIDDEN');
    }

    if (!content || content.length < 10) {
      throw new AppError('Reply must be at least 10 characters', 400, 'VALIDATION_ERROR');
    }

    reply.content = content;
    await this.replyRepository.save(reply);

    return {
      id: reply.id,
      content: reply.content,
      updatedAt: reply.updatedAt,
    };
  }

  /**
   * Delete forum reply (only author or admin can delete)
   */
  async deleteReply(replyId: string, userId: string, userRole: UserRole) {
    const reply = await this.replyRepository.findOne({
      where: { id: replyId },
      relations: ['post'],
    });

    if (!reply) {
      throw new AppError('Forum reply not found', 404, 'REPLY_NOT_FOUND');
    }

    if (reply.authorId !== userId && userRole !== UserRole.ADMIN) {
      throw new AppError('Only author or admin can delete this reply', 403, 'FORBIDDEN');
    }

    const post = reply.post;
    await this.replyRepository.remove(reply);

    // Decrement reply count
    if (post) {
      post.replyCount = Math.max(0, post.replyCount - 1);
      await this.postRepository.save(post);
    }

    return { success: true, message: 'Reply deleted successfully' };
  }

  /**
   * Mark reply as correct answer
   */
  async markAsAnswer(replyId: string, postId: string, userId: string) {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new AppError('Forum post not found', 404, 'POST_NOT_FOUND');
    }

    if (post.authorId !== userId) {
      throw new AppError('Only post author can mark replies as answer', 403, 'FORBIDDEN');
    }

    const reply = await this.replyRepository.findOne({ where: { id: replyId } });

    if (!reply) {
      throw new AppError('Forum reply not found', 404, 'REPLY_NOT_FOUND');
    }

    reply.isMarkedAsAnswer = true;
    await this.replyRepository.save(reply);

    return {
      id: reply.id,
      isMarkedAsAnswer: reply.isMarkedAsAnswer,
    };
  }
}

export const forumService = new ForumService();
