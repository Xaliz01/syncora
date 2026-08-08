import type {
  CommentEntityType,
  CommentResponse,
  CreateCommentBody,
  UpdateCommentBody,
} from "@planwise/shared";

export abstract class AbstractCommentsService {
  abstract createComment(body: CreateCommentBody): Promise<CommentResponse>;
  abstract listComments(
    organizationId: string,
    entityType: CommentEntityType,
    entityId: string,
  ): Promise<CommentResponse[]>;
  abstract getComment(id: string, organizationId: string): Promise<CommentResponse>;
  abstract updateComment(id: string, body: UpdateCommentBody): Promise<CommentResponse>;
  abstract deleteComment(id: string, organizationId: string): Promise<{ deleted: true }>;
}
