import React from 'react';
import * as fc from 'fast-check';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import StoryInput from '../components/StoryInput';

afterEach(() => {
  cleanup();
});

// Feature: ghost-story-generator, Property 8: Successful submission clears input
describe('StoryInput Property Tests', () => {
  test('Property 8: successful submission clears input field', async () => {
    fc.assert(
      await fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
        fc.uuid(),
        async (validContent: string, sessionId: string) => {
          let submittedContent: string | null = null;
          const onSubmit = (content: string) => {
            submittedContent = content;
          };

          const { container } = render(<StoryInput sessionId={sessionId} onSubmit={onSubmit} />);

          const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
          expect(textarea).toBeTruthy();

          // Set the input value
          fireEvent.change(textarea, { target: { value: validContent } });
          expect(textarea.value).toBe(validContent);

          // Submit the form
          const submitButton = screen.getByText('Add to Story');
          fireEvent.click(submitButton);

          // Wait for submission to complete
          await waitFor(() => {
            expect(submittedContent).toBe(validContent.trim());
          });

          // Verify input is cleared after successful submission
          expect(textarea.value).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: empty or whitespace-only input does not clear', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\n\n', '\t\t'),
        fc.uuid(),
        (emptyContent: string, sessionId: string) => {
          const onSubmit = jest.fn();
          const { container, unmount } = render(<StoryInput sessionId={sessionId} onSubmit={onSubmit} />);

          const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
          fireEvent.change(textarea, { target: { value: emptyContent } });

          const submitButton = container.querySelector('.btn-submit') as HTMLButtonElement;
          fireEvent.click(submitButton);

          // Verify onSubmit was not called for empty content
          expect(onSubmit).not.toHaveBeenCalled();

          // Clean up after each property test iteration
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });
});
