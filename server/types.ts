import { Request } from 'express';
import { ObjectId } from 'mongodb';
import { Server } from 'socket.io';
import { JwtPayload } from 'jsonwebtoken';
export type FakeSOSocket = Server<ServerToClientEvents>;

/**
 * Type representing the possible ordering options for questions.
 */
export type OrderType = 'newest' | 'unanswered' | 'active' | 'mostViewed';

/**
 * Interface representing an Answer document, which contains:
 * - _id - The unique identifier for the answer. Optional field
 * - text - The content of the answer
 * - ansBy - The username of the user who wrote the answer
 * - ansDateTime - The date and time when the answer was created
 * - comments - Object IDs of comments that have been added to the answer by users, or comments themselves if populated
 */
export interface Answer {
  _id?: ObjectId;
  text: string;
  ansBy: string;
  ansDateTime: Date;
  comments: Comment[] | ObjectId[];
}

/**
 * Interface extending the request body when adding an answer to a question, which contains:
 * - qid - The unique identifier of the question being answered
 * - ans - The answer being added
 */
export interface AnswerRequest extends Request {
  body: {
    qid: string;
    ans: Answer;
  };
}

/**
 * Type representing the possible responses for an Answer-related operation.
 */
export type AnswerResponse = Answer | { error: string };

/**
 * Interface representing a Tag document, which contains:
 * - _id - The unique identifier for the tag. Optional field.
 * - name - Name of the tag
 */
export interface Tag {
  _id?: ObjectId;
  name: string;
  description: string;
}

/**
 * Interface representing a Question document, which contains:
 * - _id - The unique identifier for the question. Optional field.
 * - title - The title of the question.
 * - text - The detailed content of the question.
 * - tags - An array of tags associated with the question.
 * - askedBy - The username of the user who asked the question.
 * - askDateTime - he date and time when the question was asked.
 * - answers - Object IDs of answers that have been added to the question by users, or answers themselves if populated.
 * - views - An array of usernames that have viewed the question.
 * - upVotes - An array of usernames that have upvoted the question.
 * - downVotes - An array of usernames that have downvoted the question.
 * - comments - Object IDs of comments that have been added to the question by users, or comments themselves if populated.
 */
export interface Question {
  _id?: ObjectId;
  title: string;
  text: string;
  aiGeneratedAnswer?: string;
  tags: Tag[];
  askedBy: string;
  askDateTime: Date;
  answers: Answer[] | ObjectId[];
  views: string[];
  upVotes: string[];
  downVotes: string[];
  comments: Comment[] | ObjectId[];
}

/**
 * Type representing the possible responses for a Question-related operation.
 */
export type QuestionResponse = Question | { error: string };

/**
 * Interface for the request query to find questions using a search string, which contains:
 * - order - The order in which to sort the questions
 * - search - The search string used to find questions
 * - askedBy - The username of the user who asked the question
 */
export interface FindQuestionRequest extends Request {
  query: {
    order: OrderType;
    search: string;
    askedBy: string;
  };
}

/**
 * Interface for the request parameters when finding a question by its ID.
 * - qid - The unique identifier of the question.
 */
export interface FindQuestionByIdRequest extends Request {
  params: {
    qid: string;
  };
  query: {
    username: string;
  };
}

/**
 * Interface for the request body when adding a new question.
 * - body - The question being added.
 */
export interface AddQuestionRequest extends Request {
  body: Question;
}

/**
 * Interface for the request body when upvoting or downvoting a question.
 * - body - The question ID and the username of the user voting.
 *  - qid - The unique identifier of the question.
 *  - username - The username of the user voting.
 */
export interface VoteRequest extends Request {
  body: {
    qid: string;
    username: string;
  };
}

/**
 * Interface representing a Comment, which contains:
 * - _id - The unique identifier for the comment. Optional field.
 * - text - The content of the comment.
 * - commentBy - The username of the user who commented.
 * - commentDateTime - The date and time when the comment was posted.
 *
 */
export interface Comment {
  _id?: ObjectId;
  text: string;
  commentBy: string;
  commentDateTime: Date;
}

/**
 * Interface extending the request body when adding a comment to a question or an answer, which contains:
 * - id - The unique identifier of the question or answer being commented on.
 * - type - The type of the comment, either 'question' or 'answer'.
 * - comment - The comment being added.
 */
export interface AddCommentRequest extends Request {
  body: {
    id: string;
    type: 'question' | 'answer';
    comment: Comment;
  };
}

/**
 * Type representing the possible responses for a Comment-related operation.
 */
export type CommentResponse = Comment | { error: string };

/**
 * Interface representing the payload for a comment update event, which contains:
 * - result - The updated question or answer.
 * - type - The type of the updated item, either 'question' or 'answer'.
 */
export interface CommentUpdatePayload {
  result: AnswerResponse | QuestionResponse | null;
  type: 'question' | 'answer';
}

/**
 * Interface representing the payload for a vote update event, which contains:
 * - qid - The unique identifier of the question.
 * - upVotes - An array of usernames who upvoted the question.
 * - downVotes - An array of usernames who downvoted the question.
 */
export interface VoteUpdatePayload {
  qid: string;
  upVotes: string[];
  downVotes: string[];
}

/**
 * Interface representing the payload for an answer update event, which contains:
 * - qid - The unique identifier of the question.
 * - answer - The updated answer.
 */
export interface AnswerUpdatePayload {
  qid: string;
  answer: AnswerResponse;
}

/**
 * Interface representing the possible events that the server can emit to the client.
 */
export interface ServerToClientEvents {
  questionUpdate: (question: QuestionResponse) => void;
  answerUpdate: (result: AnswerUpdatePayload) => void;
  viewsUpdate: (question: QuestionResponse) => void;
  voteUpdate: (vote: VoteUpdatePayload) => void;
  commentUpdate: (comment: CommentUpdatePayload) => void;
}

/**
 * Interface representing the SettingsInfo, which contains:
 * - theme - the currently selected color theme
 * - textSize - the currently selected size of the text
 * - textBoldness - the currently selcted text boldness
 * - font - the currently selcted font style for text
 * - lineSpacing - the currently selcted line spacing for all text
 */
export interface SettingsInfo {
  theme: string;
  textSize: string;
  textBoldness: string;
  font: string;
  lineSpacing: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
}

/**
 * Interface representing a User, which contains:
 * - _id - The unique identifier for the user. Optional field.
 * - username - The username of the user.
 * - email - The email address of the user.
 * - password - The password of the user.
 * - creationDateTime - The date and time when the user was created.
 * - settings - The settings information saved for the user. Optional field.
 * - resetPasswordToken - The token used to reset the user's password. Optional field.
 * - resetPasswordExpires - The expiration date for the reset password token. Optional field.
 * - googleId - The Google ID of the user. Optional field.
 */
export interface User {
  _id?: ObjectId;
  username: string;
  email: string;
  password: string;
  creationDateTime: Date;
  settings?: SettingsInfo;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  googleId?: string;
}

/**
 * Type representing the possible responses for a User-related operation.
 */
export type UserResponse = User | { error: string };

// Define a custom interface that includes the route parameter `username`
interface UserRequest extends Request {
  params: {
    username: string;
  };
}

/**
 * Type representing the possible responses for operation that sends an email.
 */
export type EmailResponse = { emailRecipient: string } | { error: string };

/**
 * Interface for the request body when verifying the email of a new user.
 * - body - The user being verified.
 */
export interface EmailVerificationRequest extends Request {
  body: User;
}

/**
 * Interface for the request body when adding a new user.
 * - token - The token used to verify the user.
 */
export interface AddUserRequest extends Request {
  body: {
    token: string;
  };
}

/**
 * Interface extending the request body when logging in a user, which contains:
 * - username - The username of the user logging in.
 * - password - The password to check.
 */
export interface LoginUserRequest extends Request {
  body: {
    username: string;
    password: string;
  };
}

/**
 * Interface extending the request body when requesting a password reset, which contains:
 * - username - The username of the user for the password reset request.
 */
export interface SendPasswordResetRequest extends Request {
  body: {
    username: string;
  };
}

/**
 * Interface extending the request body when resetting a password, which contains:
 * - token - The token used to reset the password.
 * - newPassword - The new password to set.
 */
export interface ResetPasswordRequest extends Request {
  body: {
    token: string;
    newPassword: string;
  };
}

export interface UpdateThemeRequest extends Request {
  body: {
    username: string;
    theme: string;
  };
}

export interface UpdateBackgroundRequest extends Request {
  body: {
    username: string;
    backgroundColor: string;
  };
}

export interface UpdateTextColorRequest extends Request {
  body: {
    username: string;
    textColor: string;
  };
}

export interface UpdateButtonRequest extends Request {
  body: {
    username: string;
    buttonColor: string;
  };
}

/**
 * Interface for the request body when changing the text size of a user.
 */
export interface UpdateTextSizeRequest extends Request {
  body: {
    username: string;
    textSize: string;
  };
}

/**
 * Interface for the request body when changing the text boldness of a user.
 */
export interface UpdateTextBoldnessRequest extends Request {
  body: {
    username: string;
    textBoldness: string;
  };
}

/**
 * Interface for the request body when changing the font style of a user.
 */
export interface UpdateFontRequest extends Request {
  body: {
    username: string;
    font: string;
  };
}

/**
 * Interface for the request body when changing the line spacing of a user.
 */
export interface UpdateLineSpacingRequest extends Request {
  body: {
    username: string;
    lineSpacing: string;
  };
}

//might not be needed
/**
 * Interface for the request body when updating multiple settings for a user.
 */
export interface UpdateSettingsRequest extends Request {
  body: {
    username: string;
    settings: SettingsInfo
  };
}

/**
 * Interface for handling Google OAuth callback, which contains:
 * - code - The code returned from Google OAuth.
 */
export interface GoogleOAuthCallbackRequest extends Request {
  query: {
    code: string;
  };
}

/**
 * Interface representing an UnverifiedUser, which contains:
 * - _id - The unique identifier for the unverified user. Optional field.
 * - username - The username of the unverified user.
 * - email - The email address of the unverified user.
 * - password - The password of the unverified user.
 * - creationDateTime - The date and time when the unverified user was created.
 * - emailVerificationToken - The token used to verify the user.
 * - emailVerificationExpires - The expiration date for the email verification token.
 */
export interface UnverifiedUser {
  _id?: ObjectId;
  username: string;
  email: string;
  password: string;
  creationDateTime: Date;
  emailVerificationToken: string;
  emailVerificationExpires: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface DecodedToken extends JwtPayload {
  userId: string;
}
