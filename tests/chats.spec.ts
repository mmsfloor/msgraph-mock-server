import { test, expect } from '@playwright/test';
import { GraphClient } from './api/graphClient';

test.describe('Chats API', () => {
  let graphClient: GraphClient;
  const demoChatId = '19:uni01_abc123def456ghi789jkl012mno345pqr678stu901@thread.v2';

  test.beforeEach(async ({ request }) => {
    graphClient = new GraphClient(request);
  });

  test('returns 200 and valid structure', async () => {
    // Arrange & Act
    const { status, body } = await graphClient.getChats();

    // Assert
    expect(status).toBe(200);
    expect(Array.isArray(body.value)).toBeTruthy();
    
    body.value.forEach((chat: any) => {
      expect(chat).toHaveProperty('id');
      expect(chat).toHaveProperty('topic');
      expect(chat).toHaveProperty('chatType');
      expect(chat).toHaveProperty('createdDateTime');
      expect(chat).toHaveProperty('members');
      expect(Array.isArray(chat.members)).toBeTruthy();
      
      chat.members.forEach((member: any) => {
        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('displayName');
      });
    });
  });

  test('returns 200 for existing chat', async () => {
    // Arrange & Act
    const { status, body } = await graphClient.getChat(demoChatId);

    // Assert
    expect(status).toBe(200);
    expect(body.id).toBe(demoChatId);
  });

  test('returns 404 for unknown chatId', async () => {
    // Arrange
    const unknownChatId = 'unknown_chat_id';

    // Act
    const { status, body } = await graphClient.getChat(unknownChatId);

    // Assert
    expect(status).toBe(404);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBeDefined();
    expect(body.error.message).toBeDefined();
  });
});
