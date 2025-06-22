/* eslint-disable @typescript-eslint/no-var-requires */
import mongoose from 'mongoose';

import ChatModel from '../../models/chat.model';
import MessageModel from '../../models/messages.model';
import UserModel from '../../models/users.model';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../../services/chat.service';
import { Chat, CreateChatPayload } from '../../types/chat';
import { Message } from '../../types/message';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

describe('Chat service', () => {
  beforeEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------------------------
  // 1. saveChat
  // ----------------------------------------------------------------------------
  describe('saveChat', () => {
    const mockChatPayload: CreateChatPayload = {
      participants: ['testUser'],
      messages: [
        {
          msg: 'Hello!',
          msgFrom: 'testUser',
          msgDateTime: new Date('2025-01-01T00:00:00.000Z'),
          type: 'direct',
        },
      ],
    };

    it('should successfully save a chat and verify its body (ignore exact IDs)', async () => {
      // 2) Mock message creation
      mockingoose(MessageModel).toReturn(
        {
          _id: new mongoose.Types.ObjectId(),
          msg: 'Hello!',
          msgFrom: 'testUser',
          msgDateTime: new Date('2025-01-01T00:00:00Z'),
          type: 'direct',
        },
        'create',
      );

      // 3) Mock chat creation
      mockingoose(ChatModel).toReturn(
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['testUser'],
          messages: [new mongoose.Types.ObjectId()],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        'create',
      );

      // 4) Call the service
      const result = await saveChat(mockChatPayload);

      // 5) Verify no error
      if ('error' in result) {
        throw new Error(`Expected a Chat, got error: ${result.error}`);
      }

      expect(result).toHaveProperty('_id');
      expect(Array.isArray(result.participants)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.participants[0]?.toString()).toEqual(expect.any(String));
      expect(result.messages[0]?.toString()).toEqual(expect.any(String));
    });

    it('should return an error if an exception occurs', async () => {
      // Using mock as mockingoose doesn't support throwing errors
      jest.spyOn(MessageModel, 'create').mockRejectedValueOnce(new Error('DB Error'));

      const result = await saveChat(mockChatPayload);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error saving chat:');
      }
    });
  });

  // ----------------------------------------------------------------------------
  // 2. createMessage
  // ----------------------------------------------------------------------------
  describe('createMessage', () => {
    // TODO: Task 3 - Write tests for the createMessage function
    const mockMessage: Message = {
      msg: 'Hey!',
      msgFrom: 'userX',
      msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
      type: 'direct',
    };

    it('should create a message successfully if user exists', async () => {
      // Mock the user existence check
      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'userX' },
        'findOne',
      );

      // Mock the created message
      const mockCreatedMsg = {
        _id: new mongoose.Types.ObjectId(),
        ...mockMessage,
      };
      mockingoose(MessageModel).toReturn(mockCreatedMsg, 'create');

      const result = await createMessage(mockMessage);

      expect(result).toMatchObject({
        msg: 'Hey!',
        msgFrom: 'userX',
        msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
        type: 'direct',
      });
    });

    it('should return an error if user not found', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');

      const result = await createMessage(mockMessage);
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('User not found');
      }
    });

    it('should return an error if message creation fails', async () => {
      mockingoose(UserModel).toReturn({ _id: 'id' }, 'findOne');
      jest.spyOn(MessageModel, 'create').mockRejectedValueOnce(new Error('Creation failed'));

      const result = await createMessage(mockMessage);
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error creating message:');
      }
    });
  });

  // ----------------------------------------------------------------------------
  // 3. addMessageToChat
  // ----------------------------------------------------------------------------
  describe('addMessageToChat', () => {
    // TODO: Task 3 - Write tests for the addMessageToChat function
    it('should add a message ID to an existing chat', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      const mockUpdatedChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [new mongoose.Types.ObjectId()],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Chat;

      // Mock findByIdAndUpdate
      mockingoose(ChatModel).toReturn(mockUpdatedChat, 'findOneAndUpdate');

      const result = await addMessageToChat(chatId, messageId);
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }

      expect(result.messages).toEqual(mockUpdatedChat.messages);
    });

    it('should return an error if chat not found', async () => {
      mockingoose(ChatModel).toReturn(null, 'findOneAndUpdate');

      const result = await addMessageToChat('invalidChatID', 'messageID');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Chat not found');
      }
    });

    it('should return an error if DB fails', async () => {
      jest.spyOn(ChatModel, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('DB Error'));

      const result = await addMessageToChat('chatID', 'messageID');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error adding message to chat:');
      }
    });
  });

  // ----------------------------------------------------------------------------
  // 4. getChat
  // ----------------------------------------------------------------------------
  describe('getChat', () => {
    it('should retrieve a chat by ID', async () => {
      const mockFoundChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Chat;

      mockingoose(ChatModel).toReturn(mockFoundChat, 'findOne'); // or 'findById' => 'findOne'
      const result = await getChat(mockFoundChat._id!.toString());

      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }
      expect(result._id).toEqual(mockFoundChat._id);
    });

    it('should return an error if the chat is not found', async () => {
      mockingoose(ChatModel).toReturn(null, 'findOne');

      const result = await getChat('chatID');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Chat not found');
      }
    });

    it('should return an error if DB fails', async () => {
      jest.spyOn(ChatModel, 'findById').mockRejectedValueOnce(new Error('DB Error'));

      const result = await getChat('chatID');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error getting chat:');
      }
    });
  });

  // ----------------------------------------------------------------------------
  // 5. addParticipantToChat
  // ----------------------------------------------------------------------------
  describe('addParticipantToChat', () => {
    // TODO: Task 3 - Write tests for the addParticipantToChat function
    it('should add a participant if user exists', async () => {
      // Mock user
      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'testUser' },
        'findOne',
      );

      const mockChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Chat;

      mockingoose(ChatModel).toReturn(mockChat, 'findOneAndUpdate');

      const result = await addParticipantToChat(mockChat._id!.toString(), 'newUserId');
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }
      expect(result._id).toEqual(mockChat._id);
    });

    it('should return an error if user does not exist', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');

      const result = await addParticipantToChat('chatID', 'invalidUserID');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('User not found');
      }
    });

    it('should return an error if chat is not found', async () => {
      mockingoose(UserModel).toReturn({ _id: 'id' }, 'findOne');
      mockingoose(ChatModel).toReturn(null, 'findOneAndUpdate');

      const result = await addParticipantToChat('chatID', 'userID');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Chat not found');
      }
    });

    it('should return an error if DB fails', async () => {
      mockingoose(UserModel).toReturn({ _id: 'id' }, 'findOne');
      jest.spyOn(ChatModel, 'findOneAndUpdate').mockRejectedValueOnce(new Error('DB Error'));

      const result = await addParticipantToChat('chatID', 'userID');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error adding participant to chat:');
      }
    });
  });

  describe('getChatsByParticipants', () => {
    it('should retrieve chats by participants', async () => {
      const mockChats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockingoose(ChatModel).toReturn([mockChats[0]], 'find');

      const result = await getChatsByParticipants(['user1', 'user2']);
      expect(result).toHaveLength(1);
      expect(result).toEqual([mockChats[0]]);
    });

    it('should retrieve chats by participants where the provided list is a subset', async () => {
      const mockChats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user2', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockingoose(ChatModel).toReturn([mockChats[0], mockChats[1]], 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(2);
      expect(result).toEqual([mockChats[0], mockChats[1]]);
    });

    it('should return an empty array if no chats are found', async () => {
      mockingoose(ChatModel).toReturn([], 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array if chats is null', async () => {
      mockingoose(ChatModel).toReturn(null, 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array if a database error occurs', async () => {
      mockingoose(ChatModel).toReturn(new Error('database error'), 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
    });
  });
});
