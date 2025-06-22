import mongoose from 'mongoose';
import supertest from 'supertest';
import { app } from '../../app';
import * as chatService from '../../services/chat.service';
import * as databaseUtil from '../../utils/database.util';
import { Chat } from '../../types/chat';
import { Message } from '../../types/message';

/**
 * Spies on the service functions
 */
const saveChatSpy = jest.spyOn(chatService, 'saveChat');
const createMessageSpy = jest.spyOn(chatService, 'createMessage');
const addMessageSpy = jest.spyOn(chatService, 'addMessageToChat');
const getChatSpy = jest.spyOn(chatService, 'getChat');
const addParticipantSpy = jest.spyOn(chatService, 'addParticipantToChat');
const populateDocumentSpy = jest.spyOn(databaseUtil, 'populateDocument');
const getChatsByParticipantsSpy = jest.spyOn(chatService, 'getChatsByParticipants');

// eslint-disable-next-line @typescript-eslint/no-var-requires

/**
 * Sample test suite for the /chat endpoints
 */
describe('Chat Controller', () => {
  describe('POST /chat/createChat', () => {
    // TODO: Task 3 Write additional tests for the createChat endpoint
    it('should create a new chat successfully', async () => {
      const validChatPayload = {
        participants: ['user1', 'user2'],
        messages: [{ msg: 'Hello!', msgFrom: 'user1', msgDateTime: new Date('2025-01-01') }],
      };

      const serializedPayload = {
        ...validChatPayload,
        messages: validChatPayload.messages.map(message => ({
          ...message,
          msgDateTime: message.msgDateTime.toISOString(),
        })),
      };

      const chatResponse: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [
          {
            _id: new mongoose.Types.ObjectId(),
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: new Date('2025-01-01'),
            user: {
              _id: new mongoose.Types.ObjectId(),
              username: 'user1',
            },
            type: 'direct',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      saveChatSpy.mockResolvedValue(chatResponse);
      populateDocumentSpy.mockResolvedValue(chatResponse);

      const response = await supertest(app).post('/chat/createChat').send(validChatPayload);

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        _id: chatResponse._id?.toString(),
        participants: chatResponse.participants.map(participant => participant.toString()),
        messages: chatResponse.messages.map(message => ({
          ...message,
          _id: message._id?.toString(),
          msgDateTime: message.msgDateTime.toISOString(),
          user: {
            ...message.user,
            _id: message.user?._id.toString(),
          },
        })),
        createdAt: chatResponse.createdAt?.toISOString(),
        updatedAt: chatResponse.updatedAt?.toISOString(),
      });

      expect(saveChatSpy).toHaveBeenCalledWith(serializedPayload);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chatResponse._id?.toString(), 'chat');
    });

    it('should return 400 error if chat creation request is invalid', async () => {
      const response = await supertest(app).post('/chat/createChat').send({});
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid create chat request');
    });

    it('should return 500 error if chat creation fails', async () => {
      saveChatSpy.mockResolvedValue({ error: 'Service error' });

      const response = await supertest(app)
        .post('/chat/createChat')
        .send({
          participants: ['user1', 'user2'],
          messages: [{ msg: 'Hello!', msgFrom: 'user1' }],
        });
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error creating a chat: Service error');
    });
  });

  describe('POST /chat/:chatId/addMessage', () => {
    // TODO: Task 3 Write additional tests for the addMessage endpoint
    it('should add a message to chat successfully', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messagePayload: Message = {
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct',
      };

      const serializedPayload = {
        ...messagePayload,
        msgDateTime: messagePayload.msgDateTime.toISOString(),
      };

      const messageResponse = {
        _id: new mongoose.Types.ObjectId(),
        ...messagePayload,
        user: {
          _id: new mongoose.Types.ObjectId(),
          username: 'user1',
        },
      };

      const chatResponse = {
        _id: chatId,
        participants: ['user1', 'user2'],
        messages: [messageResponse],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      createMessageSpy.mockResolvedValue(messageResponse);
      addMessageSpy.mockResolvedValue(chatResponse);
      populateDocumentSpy.mockResolvedValue(chatResponse);

      const response = await supertest(app).post(`/chat/${chatId}/addMessage`).send(messagePayload);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        _id: chatResponse._id.toString(),
        participants: chatResponse.participants.map(participant => participant.toString()),
        messages: chatResponse.messages.map(message => ({
          ...message,
          _id: message._id.toString(),
          msgDateTime: message.msgDateTime.toISOString(),
          user: {
            ...message.user,
            _id: message.user._id.toString(),
          },
        })),
        createdAt: chatResponse.createdAt.toISOString(),
        updatedAt: chatResponse.updatedAt.toISOString(),
      });

      expect(createMessageSpy).toHaveBeenCalledWith(serializedPayload);
      expect(addMessageSpy).toHaveBeenCalledWith(chatId.toString(), messageResponse._id.toString());
      expect(populateDocumentSpy).toHaveBeenCalledWith(chatResponse._id.toString(), 'chat');
    });

    it('should return 400 error if chatID is missing', async () => {
      const response = await supertest(app).post(`/chat/123/addMessage`).send({});
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid add message request');
    });

    it('should return 400 error if message is missing', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const response = await supertest(app)
        .post(`/chat/${chatId}/addMessage`)
        .send({ msgFrom: 'user1' });
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid add message request');
    });

    it('should return 400 error if msgFrom is missing', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const response = await supertest(app)
        .post(`/chat/${chatId}/addMessage`)
        .send({ msg: 'Hello!' });
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid add message request');
    });

    it('should return 500 error if create message fails', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messagePayload: Message = {
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct',
      };

      createMessageSpy.mockResolvedValue({ error: 'Service error' });

      const response = await supertest(app).post(`/chat/${chatId}/addMessage`).send(messagePayload);
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error adding message to the chat: Service error');
    });

    it('should return 500 error if update chat fails', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messagePayload: Message = {
        _id: new mongoose.Types.ObjectId(),
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct',
      };

      createMessageSpy.mockResolvedValue(messagePayload);
      addMessageSpy.mockResolvedValue({ error: 'Service error' });

      const response = await supertest(app).post(`/chat/${chatId}/addMessage`).send(messagePayload);
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error adding message to the chat:');
    });

    it('should return 500 error if populate chat fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const foundChat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1'],
        messages: [],
      };

      getChatSpy.mockResolvedValue(foundChat);
      populateDocumentSpy.mockResolvedValue({ error: 'Unable to populate chat' });

      const response = await supertest(app).get(`/chat/${chatId}`);

      expect(response.status).toBe(500);
      expect(populateDocumentSpy).toHaveBeenCalledWith(foundChat._id.toString(), 'chat');
      expect(response.text).toContain('Error retrieving chat: Unable to populate chat');
    });
  });

  describe('GET /chat/:chatId', () => {
    // TODO: Task 3 Write additional tests for the getChat endpoint
    it('should retrieve a chat by ID', async () => {
      // 1) Prepare a valid chatId param
      const chatId = new mongoose.Types.ObjectId().toString();

      // 2) Mock a fully enriched chat
      const mockFoundChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1'],
        messages: [
          {
            _id: new mongoose.Types.ObjectId(),
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: new Date('2025-01-01T00:00:00Z'),
            user: {
              _id: new mongoose.Types.ObjectId(),
              username: 'user1',
            },
            type: 'direct',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 3) Mock the service calls
      getChatSpy.mockResolvedValue(mockFoundChat);
      populateDocumentSpy.mockResolvedValue(mockFoundChat);

      // 4) Invoke the endpoint
      const response = await supertest(app).get(`/chat/${chatId}`);

      // 5) Assertions
      expect(response.status).toBe(200);
      expect(getChatSpy).toHaveBeenCalledWith(chatId);
      expect(populateDocumentSpy).toHaveBeenCalledWith(mockFoundChat._id?.toString(), 'chat');

      // Convert ObjectIds and Dates for comparison
      expect(response.body).toMatchObject({
        _id: mockFoundChat._id?.toString(),
        participants: mockFoundChat.participants.map(p => p.toString()),
        messages: mockFoundChat.messages.map(m => ({
          _id: m._id?.toString(),
          msg: m.msg,
          msgFrom: m.msgFrom,
          msgDateTime: m.msgDateTime.toISOString(),
          user: {
            _id: m.user?._id.toString(),
            username: m.user?.username,
          },
        })),
        createdAt: mockFoundChat.createdAt?.toISOString(),
        updatedAt: mockFoundChat.updatedAt?.toISOString(),
      });
    });

    it('should return 500 error if getChat fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      getChatSpy.mockResolvedValue({ error: 'Service error' });

      const response = await supertest(app).get(`/chat/${chatId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error retrieving chat:');
    });
  });

  describe('POST /chat/:chatId/addParticipant', () => {
    // TODO: Task 3 Write additional tests for the addParticipant endpoint
    it('should add a participant to an existing chat', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const participant = new mongoose.Types.ObjectId().toString();

      const updatedChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addParticipantSpy.mockResolvedValue(updatedChat);

      const response = await supertest(app)
        .post(`/chat/${chatId}/addParticipant`)
        .send({ participant });

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        _id: updatedChat._id?.toString(),
        participants: updatedChat.participants.map(id => id.toString()),
        messages: [],
        createdAt: updatedChat.createdAt?.toISOString(),
        updatedAt: updatedChat.updatedAt?.toISOString(),
      });

      expect(addParticipantSpy).toHaveBeenCalledWith(chatId, participant);
    });

    it('should return 400 error if chatId is missing', async () => {
      const response = await supertest(app).post(`/chat/123/addParticipant`).send({});
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid reuqest body. Missing chatId or participant');
    });

    it('should return 400 error if participant is missing', async () => {
      const response = await supertest(app).post(`/chat/123/addParticipant`).send({});
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid reuqest body. Missing chatId or participant');
    });

    it('should return 500 error if addParticipantToChat fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const participant = new mongoose.Types.ObjectId().toString();
      addParticipantSpy.mockResolvedValue({ error: 'Failed to add participant' });

      const response = await supertest(app)
        .post(`/chat/${chatId}/addParticipant`)
        .send({ participant });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error adding participant to chat: Failed to add participant');
    });
  });

  describe('POST /chat/getChatsByUser/:username', () => {
    it('should return 200 with an array of chats', async () => {
      const username = 'user1';
      const chats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      getChatsByParticipantsSpy.mockResolvedValueOnce(chats);
      populateDocumentSpy.mockResolvedValueOnce(chats[0]);

      const response = await supertest(app).get(`/chat/getChatsByUser/${username}`);

      expect(getChatsByParticipantsSpy).toHaveBeenCalledWith([username]);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chats[0]._id?.toString(), 'chat');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject([
        {
          _id: chats[0]._id?.toString(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: chats[0].createdAt?.toISOString(),
          updatedAt: chats[0].updatedAt?.toISOString(),
        },
      ]);
    });

    it('should return 500 if populateDocument fails for any chat', async () => {
      const username = 'user1';
      const chats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      getChatsByParticipantsSpy.mockResolvedValueOnce(chats);
      populateDocumentSpy.mockResolvedValueOnce({ error: 'Service error' });

      const response = await supertest(app).get(`/chat/getChatsByUser/${username}`);

      expect(getChatsByParticipantsSpy).toHaveBeenCalledWith([username]);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chats[0]._id?.toString(), 'chat');
      expect(response.status).toBe(500);
      expect(response.text).toBe('Error retrieving chat: Failed populating the chats');
    });
  });
});
