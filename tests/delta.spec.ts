import { test, expect } from '@playwright/test';
import { GraphClient } from './api/graphClient';

test.describe('Delta API', () => {
  let graphClient: GraphClient;
  const demoChatId = '19:uni01_abc123def456ghi789jkl012mno345pqr678stu901@thread.v2';

  test.beforeEach(async ({ request }) => {
    graphClient = new GraphClient(request);
  });

  test('global delta returns 200 and @odata.deltaLink', async () => {
    // Act
    const { status, body } = await graphClient.getGlobalDelta();

    // Assert
    expect(status).toBe(200);
    expect(body['@odata.deltaLink']).toBeDefined();
    expect(Array.isArray(body.value)).toBeTruthy();
  });

  test('chat delta returns 200 and @odata.deltaLink', async () => {
    // Act
    const { status, body } = await graphClient.getMessagesDelta(demoChatId);

    // Assert
    expect(status).toBe(200);
    expect(body['@odata.deltaLink']).toBeDefined();
    expect(Array.isArray(body.value)).toBeTruthy();
    expect(body.value.length).toBeGreaterThan(0);
  });
});
