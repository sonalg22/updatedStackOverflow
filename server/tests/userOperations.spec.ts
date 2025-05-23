import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { MongoServerError } from 'mongodb';
import {
  sendEmailVerification,
  saveUser,
  loginUser,
  sendPasswordReset,
  resetPassword,
  changeTheme,
  changeTextSize,
  changeTextBoldness,
  changeFont,
  changeLineSpacing,
  findOrSaveGoogleUser,
} from '../models/userOperations';
import UserModel from '../models/users';
import UnverifiedUserModel from '../models/unverifiedUsers';
import sendMail from '../utils/emailConfig';
import { User } from '../types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

jest.mock('../utils/emailConfig');
jest.mock('bcrypt');
jest.mock('crypto');

const mockUser = {
  _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6dc'),
  username: 'fakeUser',
  email: 'fakeEmail@email.com',
  password: 'fakepassword',
  creationDateTime: new Date('2024-06-03'),
  resetPasswordToken: undefined,
  resetPasswordExpires: undefined,
};

const mockGoogleUser = {
  _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6dc'),
  username: 'fakeEmail_012345',
  email: 'fakeEmail@email.com',
  password: '313233343536',
  creationDateTime: new Date('2024-06-03'),
  resetPasswordToken: undefined,
  resetPasswordExpires: undefined,
};

describe('User model', () => {
  beforeEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  describe('sendEmailVerification', () => {
    test('sendEmailVerification should return email address of the verification recipient on success', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');
      mockingoose(UnverifiedUserModel).toReturn(mockUser, 'create');
      (crypto.randomBytes as jest.Mock).mockReturnValueOnce(Buffer.from('12345678901234567890'));
      (sendMail as jest.Mock).mockResolvedValueOnce('Email verification successfully sent');

      const result = await sendEmailVerification(mockUser);
      expect(result).toEqual({ emailRecipient: 'fakeEmail@email.com' });
    });

    test('sendEmailVerification should return an object with error if findOne throws an error', async () => {
      mockingoose(UserModel).toReturn(
        new Error('Error when creating an unverified user'),
        'findOne',
      );

      const result = await sendEmailVerification(mockUser);
      expect(result).toEqual({ error: 'Error when creating an unverified user' });
    });

    test('sendEmailVerification should return an object with error if create throws an error', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');
      jest.spyOn(UnverifiedUserModel, 'create').mockImplementationOnce(() => {
        throw new Error('Error when creating an unverified user');
      });
      (crypto.randomBytes as jest.Mock).mockReturnValueOnce(Buffer.from('12345678901234567890'));

      const result = await sendEmailVerification(mockUser);
      expect(result).toEqual({ error: 'Error when creating an unverified user' });
    });

    test('sendEmailVerification should return an object with error if user already exists', async () => {
      mockingoose(UserModel).toReturn(mockUser, 'findOne');

      const result = await sendEmailVerification(mockUser);
      expect(result).toEqual({ error: 'Username is already taken' });
    });

    test('sendEmailVerification should return an object with error if bcrypt.hash throws an error', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');
      (bcrypt.hash as jest.Mock).mockRejectedValueOnce(new Error('Error hashing password'));

      const result = await sendEmailVerification(mockUser);
      expect(result).toEqual({ error: 'Error hashing password' });
    });

    test('sendEmailVerification should return an object with error if crypto.randomBytes throws an error', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');
      (crypto.randomBytes as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Error generating random bytes');
      });

      const result = await sendEmailVerification(mockUser);
      expect(result).toEqual({ error: 'Error generating random bytes' });
    });

    test('sendEmailVerification should return an object with error if sendMail throws an error', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');
      mockingoose(UnverifiedUserModel).toReturn(mockUser, 'create');
      (crypto.randomBytes as jest.Mock).mockReturnValueOnce(Buffer.from('12345678901234567890'));
      (sendMail as jest.Mock).mockRejectedValueOnce(new Error('Error sending email'));

      const result = await sendEmailVerification(mockUser);
      expect(result).toEqual({ error: 'Error sending email' });
    });
  });

  describe('saveUser', () => {
    test('saveUser should return the saved user', async () => {
      mockingoose(UnverifiedUserModel).toReturn(mockUser, 'findOneAndDelete');
      mockingoose(UserModel).toReturn(mockUser, 'create');

      const result = (await saveUser('fakeToken')) as User;
      expect(result.username).toEqual(mockUser.username);
      expect(result.email).toEqual(mockUser.email);
      expect(result.password).toEqual(mockUser.password);
      expect(result.creationDateTime).toEqual(mockUser.creationDateTime);
    });

    test('saveUser should return an object with error if findOneAndDelete throws an error', async () => {
      mockingoose(UnverifiedUserModel).toReturn(
        new Error('Error when finding unverified user'),
        'findOneAndDelete',
      );

      const result = await saveUser('fakeToken');
      expect(result).toEqual({ error: 'Error when creating a user' });
    });

    test('saveUser should return an object with error if create throws an error', async () => {
      mockingoose(UnverifiedUserModel).toReturn(mockUser, 'findOneAndDelete');
      jest.spyOn(UserModel, 'create').mockImplementationOnce(() => {
        throw new Error('Error when creating a user');
      });

      const result = await saveUser('fakeToken');
      expect(result).toEqual({ error: 'Error when creating a user' });
    });

    test('saveUser should return an object with error if findOneAndDelete returns null', async () => {
      mockingoose(UnverifiedUserModel).toReturn(null, 'findOneAndDelete');

      const result = await saveUser('fakeToken');
      expect(result).toEqual({ error: 'Email verification token is invalid or has expired' });
    });

    test('saveUser should return an object with error if user already exists', async () => {
      mockingoose(UnverifiedUserModel).toReturn(mockUser, 'findOneAndDelete');
      jest.spyOn(UserModel, 'create').mockImplementationOnce(() => {
        throw new MongoServerError({
          message: 'E11000 duplicate key error collection',
          code: 11000,
        });
      });

      const result = await saveUser('fakeToken');
      expect(result).toEqual({ error: 'Username is already taken' });
    });
  });

  describe('loginUser', () => {
    test('loginUser should return the user attempting to log in', async () => {
      mockingoose(UserModel).toReturn(mockUser, 'findOne');
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = (await loginUser('fakeUser', 'fakepassword')) as User;
      expect(result._id).toBeDefined();
      expect(result.username).toEqual(mockUser.username);
      expect(result.email).toEqual(mockUser.email);
      expect(result.password).toEqual(mockUser.password);
      expect(result.creationDateTime).toEqual(mockUser.creationDateTime);
    });

    test('loginUser should return an object with error if findOne returns null', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');

      const result = await loginUser('fakeUser', 'fakepassword');
      expect(result).toEqual({ error: 'Username does not exist' });
    });

    test('loginUser should return an object with error if findOne throws an error', async () => {
      mockingoose(UserModel).toReturn(new Error('Error logging in user'), 'findOne');

      const result = await loginUser('fakeUser', 'fakepassword');
      expect(result).toEqual({ error: 'Error logging in user' });
    });

    test('loginUser should return an object with error if the password is incorrect', async () => {
      mockingoose(UserModel).toReturn(mockUser, 'findOne');
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const result = await loginUser('fakeUser', 'fakepassword');
      expect(result).toEqual({ error: 'Incorrect password' });
    });

    test('loginUser should return an object with error if bcrypt.compare throws an error', async () => {
      mockingoose(UserModel).toReturn(mockUser, 'findOne');
      (bcrypt.compare as jest.Mock).mockRejectedValueOnce(new Error('Error comparing password'));

      const result = await loginUser('fakeUser', 'fakepassword');
      expect(result).toEqual({ error: 'Error logging in user' });
    });
  });

  describe('sendPasswordReset', () => {
    test('sendPasswordReset should return email address of the password reset recipient on success', async () => {
      mockingoose(UserModel).toReturn(mockUser, 'findOneAndUpdate');
      (sendMail as jest.Mock).mockResolvedValueOnce('Password reset email successfully sent');
      (crypto.randomBytes as jest.Mock).mockReturnValueOnce(Buffer.from('12345678901234567890'));

      const result = await sendPasswordReset('fakeUser');
      expect(result).toEqual({ emailRecipient: 'fakeEmail@email.com' });
    });

    test('sendPasswordReset should return an object with error if findOneAndUpdate returns null', async () => {
      mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');
      (crypto.randomBytes as jest.Mock).mockReturnValueOnce(Buffer.from('12345678901234567890'));

      const result = await sendPasswordReset('fakeUser');
      expect(result).toEqual({ error: 'Username does not exist' });
    });

    test('sendPasswordReset should return an object with error if findOneAndUpdate throws an error', async () => {
      mockingoose(UserModel).toReturn(
        new Error('Error sending password reset email'),
        'findOneAndUpdate',
      );
      (crypto.randomBytes as jest.Mock).mockReturnValueOnce(Buffer.from('12345678901234567890'));

      const result = await sendPasswordReset('fakeUser');
      expect(result).toEqual({ error: 'Error sending password reset email' });
    });

    test('sendPasswordReset should return an object with error if sendMail throws an error', async () => {
      mockingoose(UserModel).toReturn(mockUser, 'findOneAndUpdate');
      (sendMail as jest.Mock).mockRejectedValueOnce(new Error('Error sending email'));
      (crypto.randomBytes as jest.Mock).mockReturnValueOnce(Buffer.from('12345678901234567890'));

      const result = await sendPasswordReset('fakeUser');
      expect(result).toEqual({ error: 'Error sending email' });
    });

    test('sendPasswordReset should return an object with error if crypto.randomBytes throws an error', async () => {
      (crypto.randomBytes as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Error generating random bytes');
      });

      const result = await sendPasswordReset('fakeUser');
      expect(result).toEqual({ error: 'Error generating random bytes' });
    });
  });

  describe('resetPassword', () => {
    test('resetPassword should return the updated user with password on success', async () => {
      mockingoose(UserModel).toReturn(mockUser, 'findOneAndUpdate');

      const result = (await resetPassword('fakeToken', 'newPassword')) as User;
      expect(result._id).toBeDefined();
      expect(result.username).toEqual(mockUser.username);
      expect(result.email).toEqual(mockUser.email);
      expect(result.password).toEqual(mockUser.password);
      expect(result.resetPasswordToken).toEqual(mockUser.resetPasswordToken);
      expect(result.resetPasswordExpires).toEqual(mockUser.resetPasswordExpires);
    });

    test('resetPassword should return an object with error if findOneAndUpdate returns null', async () => {
      mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');

      const result = await resetPassword('fakeToken', 'newPassword');
      expect(result).toEqual({ error: 'Password reset token is invalid or has expired' });
    });

    test('resetPassword should return an object with error if findOneAndUpdate throws an error', async () => {
      mockingoose(UserModel).toReturn(new Error('Error resetting password'), 'findOneAndUpdate');

      const result = await resetPassword('fakeToken', 'newPassword');
      expect(result).toEqual({ error: 'Error resetting password' });
    });

    test('resetPassword should return an object with error if bcrypt.hash throws an error', async () => {
      (bcrypt.hash as jest.Mock).mockRejectedValueOnce(new Error('Error hashing password'));

      const result = await resetPassword('fakeToken', 'newPassword');
      expect(result).toEqual({ error: 'Error resetting password' });
    });
  });

  describe('changeTheme', () => {
    test('changeTheme should return error if username does not exist', async () => {
      mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');
      const result = await changeTheme('nonExistentUser', 'darkMode');
      expect(result).toEqual({ error: 'Username does not exist' });
    });
    test('changeTheme should return updated user on success', async () => {
      const mockUser2 = {
        _id: '65e9b58910afe6e94fc6e6dc',
        creationDateTime: new Date('2024-06-03T00:00:00.000Z'),
        email: 'fakeEmail@email.com',
        password: 'fakepassword',
        username: 'fakeUser',
        settings: { theme: 'dark' },
      };
      mockingoose(UserModel).toReturn(mockUser2, 'findOneAndUpdate');
      const result = await changeTheme('fakeUser', 'darkMode');
      expect(result).toMatchObject({
        username: 'fakeUser',
        settings: { theme: 'dark' },
      });
    });
    test('changeTheme should return error if an unexpected error occurs', async () => {
      mockingoose(UserModel).toReturn(new Error('Database error'), 'findOneAndUpdate');
      const result = await changeTheme('testUser', 'dark');
      expect(result).toEqual({ error: 'Error changing user theme' });
    });
  });
  describe('changeTextSize', () => {
    test('changeTextSize should return an error if user is not found', async () => {
      mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');
      const result = await changeTextSize('nonExistentUser', 'small');
      expect(result).toEqual({ error: 'Username does not exist' });
    });

    test('changeTextSize should return an error if there is a database error', async () => {
      mockingoose(UserModel).toReturn(new Error('Database error'), 'findOneAndUpdate');
      const result = await changeTextSize('testUser', 'medium');
      expect(result).toEqual({ error: 'Error changing user text size' });
    });
  });

  describe('changeTextBoldness', () => {
    test('should return error if username does not exist', async () => {
      mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');
      const result = await changeTextBoldness('nonexistentUser', 'bold');
      expect(result).toEqual({ error: 'Username does not exist' });
    });
  });

  describe('changeFont', () => {
    test('should return error if username does not exist', async () => {
      mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');

      const result = await changeFont('nonexistentUser', 'Arial');
      expect(result).toEqual({ error: 'Username does not exist' });
    });

    test('should return error if there is an error changing the font', async () => {
      mockingoose(UserModel).toReturn(new Error('Database error'), 'findOneAndUpdate');

      const result = await changeFont('existingUser', 'Arial');
      expect(result).toEqual({ error: 'Error changing user font style' });
    });
  });

  describe('changeLineSpacing', () => {
    test('should return error if username does not exist', async () => {
      mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');

      const result = await changeLineSpacing('nonexistentUser', '1.5');
      expect(result).toEqual({ error: 'Username does not exist' });
    });

    test('should return error if there is an error changing the line spacing', async () => {
      mockingoose(UserModel).toReturn(new Error('Database error'), 'findOneAndUpdate');

      const result = await changeLineSpacing('existingUser', '1.5');
      expect(result).toEqual({ error: 'Error changing user line spacing' });
    });
  });

  describe('findOrSaveGoogleUser', () => {
    test('should return the user if it already exists', async () => {
      mockingoose(UserModel).toReturn(mockGoogleUser, 'findOne');
      const result = (await findOrSaveGoogleUser('12345', 'dummyEmail')) as User;
      expect(result.username).toEqual(mockGoogleUser.username);
      expect(result.email).toEqual(mockGoogleUser.email);
      expect(result.password).toEqual(mockGoogleUser.password);
      expect(result.creationDateTime).toEqual(mockGoogleUser.creationDateTime);
    });

    test('should return the user if it is successfully created', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');
      mockingoose(UserModel).toReturn(mockGoogleUser, 'create'); // Create a deep copy of mockGoogleUser
      (crypto.createHash as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValueOnce('0123456789abcdef'),
      });
      (crypto.randomBytes as jest.Mock).mockReturnValueOnce(Buffer.from('313233343536', 'hex'));

      const result = (await findOrSaveGoogleUser('12345', mockGoogleUser.email)) as User;
      expect(result.username).toEqual(mockGoogleUser.username);
      expect(result.email).toEqual(mockGoogleUser.email);
      expect(result.password).toEqual(mockGoogleUser.password);
    });

    test('should return an object with error if findOne throws an error', async () => {
      mockingoose(UserModel).toReturn(new Error('Error finding user'), 'findOne');

      const result = await findOrSaveGoogleUser('12345', mockGoogleUser.email);
      expect(result).toEqual({ error: 'Error when retrieving or creating a Google user' });
    });

    test('should return an object with error if create throws an error', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');
      jest.spyOn(UserModel, 'create').mockImplementationOnce(() => {
        throw new Error('Error creating a Google user');
      });

      const result = await findOrSaveGoogleUser('12345', mockGoogleUser.email);
      expect(result).toEqual({ error: 'Error when retrieving or creating a Google user' });
    });

    test('should return an object with error if crypto.randomBytes throws an error', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');
      (crypto.randomBytes as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Error generating random bytes');
      });

      const result = await findOrSaveGoogleUser('12345', mockGoogleUser.email);
      expect(result).toEqual({ error: 'Error when retrieving or creating a Google user' });
    });

    test('should return an object with error if crypto.createHash throws an error', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');
      (crypto.createHash as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Error creating hash');
      });

      const result = await findOrSaveGoogleUser('12345', mockGoogleUser.email);
      expect(result).toEqual({ error: 'Error when retrieving or creating a Google user' });
    });
  });
});
