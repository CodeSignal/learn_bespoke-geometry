// @ts-expect-error design-system is plain JS, no types
import Modal from './design-system/components/modal/modal.js';
import { logAction } from './logger.js';

let websocket: WebSocket | null = null;
let helpModal: ReturnType<typeof Modal.createHelpModal> | null = null;

function initializeWebSocket(): void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/ws`;

  try {
    websocket = new WebSocket(wsUrl);

    websocket.onopen = function (_event: Event) {
      console.log('WebSocket connected');
    };

    websocket.onmessage = function (event: MessageEvent) {
      try {
        const data = JSON.parse(event.data as string) as { type?: string; message?: string };
        if (data.type === 'message' && data.message) {
          alert(data.message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onclose = function (_event: CloseEvent) {
      console.log('WebSocket disconnected');
      setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        initializeWebSocket();
      }, 3000);
    };

    websocket.onerror = function (error: Event) {
      console.error('WebSocket error:', error);
    };
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
  }
}

async function initializeHelpModal(): Promise<void> {
  try {
    const response = await fetch('./help-content.html');
    const helpContent = await response.text();

    helpModal = Modal.createHelpModal({
      title: 'Help / User Guide',
      content: helpContent
    });

    const helpButton = document.getElementById('btn-help');
    if (helpButton) {
      helpButton.addEventListener('click', () => {
        helpModal?.open();
      });
    }
  } catch (error) {
    console.error('Failed to load help content:', error);
    helpModal = Modal.createHelpModal({
      title: 'Help / User Guide',
      content: '<p>Help content could not be loaded. Please check that help-content.html exists.</p>'
    });
    const helpButton = document.getElementById('btn-help');
    if (helpButton) {
      helpButton.addEventListener('click', () => helpModal?.open());
    }
  }
}

async function initialize(): Promise<void> {
  await initializeHelpModal();
  initializeWebSocket();
  if (typeof window !== 'undefined') {
    (window as unknown as { logAction: typeof logAction }).logAction = logAction;
    logAction('app_ready');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initialize());
} else {
  initialize();
}
