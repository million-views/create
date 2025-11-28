import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { processMarkdownFile } from '@m5nv/create/lib/templatize/strategy/markdown.mts';

describe('Templatize Markdown Tests', () => {
  describe('Markdown Processor - Basic functionality', () => {
    it('should process simple markdown with heading content', async () => {
      const content = `# My Project

This is a description of my project.
`;

      const config = {
        patterns: [
          {
            context: 'text/markdown#heading',
            selector: 'h1',
            placeholder: 'projectName'
          }
        ]
      };

      const result = await processMarkdownFile('test.md', content, config.patterns);
      assert.equal(result.length, 1);
      assert.equal(result[0].originalText, 'My Project');
      assert.equal(result[0].placeholder, 'projectName');
      assert.equal(result[0].startIndex, 2);
      assert.equal(result[0].endIndex, 12);
    });

    it('should process markdown with multiple headings', async () => {
      const content = `# Title One

Some content here.

## Title Two

More content.

### Title Three

Even more content.
`;

      const config = {
        patterns: [
          {
            context: 'text/markdown#heading',
            selector: 'h1,h2,h3',
            placeholder: 'heading'
          }
        ]
      };

      const result = await processMarkdownFile('test.md', content, config.patterns);
      assert.equal(result.length, 3);

      // Check h1
      assert.equal(result[0].originalText, 'Title One');
      assert.equal(result[0].placeholder, 'heading');
      assert.equal(result[0].startIndex, 2);
      assert.equal(result[0].endIndex, 11);

      // Check h2
      assert.equal(result[1].originalText, 'Title Two');
      assert.equal(result[1].placeholder, 'heading');
      assert.equal(result[1].startIndex, 36);
      assert.equal(result[1].endIndex, 45);

      // Check h3
      assert.equal(result[2].originalText, 'Title Three');
      assert.equal(result[2].placeholder, 'heading');
      assert.equal(result[2].startIndex, 66);
      assert.equal(result[2].endIndex, 77);
    });

    it('should process frontmatter YAML', async () => {
      const content = `---
title: "My Project"
description: "A cool project"
version: "1.0.0"
---

# Welcome

Content here.
`;

      const config = {
        patterns: [
          {
            context: 'text/markdown',
            selector: 'frontmatter.title',
            placeholder: 'projectName'
          },
          {
            context: 'text/markdown',
            selector: 'frontmatter.description',
            placeholder: 'projectDescription'
          }
        ]
      };

      const result = await processMarkdownFile('test.md', content, config.patterns);
      assert.equal(result.length, 2);

      // Check title
      assert.equal(result[0].originalText, 'My Project');
      assert.equal(result[0].placeholder, 'projectName');
      assert.equal(result[0].startIndex, 12);
      assert.equal(result[0].endIndex, 22);

      // Check description
      assert.equal(result[1].originalText, 'A cool project');
      assert.equal(result[1].placeholder, 'projectDescription');
      assert.equal(result[1].startIndex, 38);
      assert.equal(result[1].endIndex, 52);
    });

    it('should respect allowMultiple flag', async () => {
      const content = `# First Heading

Some content.

# Second Heading

More content.
`;

      const patterns = [
        {
          context: 'text/markdown#heading',
          selector: 'h1',
          placeholder: 'heading',
          allowMultiple: false
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      assert.equal(result.length, 1); // Only first match due to allowMultiple: false
      assert.equal(result[0].originalText, 'First Heading');
    });

    it('should handle skip comments', async () => {
      const content = `<!-- @template-skip -->
# Skipped Heading
<!-- @end-template-skip -->

# Normal Heading

More content.
`;

      const patterns = [
        {
          context: 'text/markdown#heading',
          selector: 'h1',
          placeholder: 'heading'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      assert.equal(result.length, 1);
      assert.equal(result[0].originalText, 'Normal Heading');
    });

    it('should handle malformed markdown gracefully', async () => {
      const content = `# Unclosed heading

Some content without proper structure.
`;

      const patterns = [
        {
          context: 'text/markdown#heading',
          selector: 'h1',
          placeholder: 'heading'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      assert.equal(result.length, 1);
      assert.equal(result[0].originalText, 'Unclosed heading');
    });

    it('should return empty array for files without matches', async () => {
      const content = `This is just plain text without any markdown structure.`;

      const patterns = [
        {
          context: 'text/markdown#heading',
          selector: 'h1',
          placeholder: 'heading'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      assert.equal(result.length, 0);
    });
  });

  describe('Markdown Processor - Edge cases', () => {
    it('should handle empty markdown', async () => {
      const content = '';

      const patterns = [
        {
          context: 'text/markdown#heading',
          selector: 'h1',
          placeholder: 'heading'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      assert.equal(result.length, 0);
    });

    it('should handle markdown with only frontmatter', async () => {
      const content = `---
title: "Test"
description: "Description"
---

`;

      const patterns = [
        {
          context: 'text/markdown',
          selector: 'frontmatter.title',
          placeholder: 'title'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      assert.equal(result.length, 1);
      assert.equal(result[0].originalText, 'Test');
    });

    it('should handle nested frontmatter structures', async () => {
      const content = `---
project:
  name: "My App"
  version: "1.0.0"
description: "A project"
---

# Welcome
`;

      const patterns = [
        {
          context: 'text/markdown',
          selector: 'frontmatter.project.name',
          placeholder: 'projectName'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      assert.equal(result.length, 1);
      assert.equal(result[0].originalText, 'My App');
    });
  });

  describe('Markdown Processor - Content types', () => {
    it('should handle code blocks', async () => {
      const content = `# Installation

\`\`\`bash
npm install ⦃PACKAGE_NAME⦄
\`\`\`

Some text.
`;

      const patterns = [
        {
          context: 'text/markdown',
          selector: 'code',
          placeholder: 'installCommand'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      // Manual placeholders take precedence - should skip areas with existing placeholders (any format)
      assert.equal(result.length, 0);
    });

    it('should handle inline code', async () => {
      const content = `Use \`⦃COMMAND⦄\` to run the script.`;

      const patterns = [
        {
          context: 'text/markdown',
          selector: 'inline-code',
          placeholder: 'runCommand'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      // Manual placeholders take precedence - should skip areas with existing placeholders (any format)
      assert.equal(result.length, 0);
    });

    it('should handle links', async () => {
      const content = `Check out [my project](https://github.com/user/repo).`;

      const patterns = [
        {
          context: 'text/markdown',
          selector: 'link',
          placeholder: 'projectLink'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      assert.equal(result.length, 1);
      assert.equal(result[0].originalText, 'https://github.com/user/repo');
      assert.equal(result[0].placeholder, 'projectLink');
    });

    it('should handle images', async () => {
      const content = `![Logo](./images/logo.png)`;

      const patterns = [
        {
          context: 'text/markdown',
          selector: 'image',
          placeholder: 'logoPath'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      assert.equal(result.length, 1);
      assert.equal(result[0].originalText, './images/logo.png');
      assert.equal(result[0].placeholder, 'logoPath');
    });
  });

  describe('Markdown Processor - Selector validation', () => {
    it('should handle invalid selectors gracefully', async () => {
      const content = `# Test Heading`;

      const patterns = [
        {
          context: 'text/markdown',
          selector: 'invalid-selector',
          placeholder: 'test'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      assert.equal(result.length, 0);
    });

    it('should validate frontmatter paths', async () => {
      const content = `---
title: "Test"
---

# Heading
`;

      const patterns = [
        {
          context: 'text/markdown',
          selector: 'frontmatter.nonexistent',
          placeholder: 'test'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);
      assert.equal(result.length, 0);
    });

    it('should skip content within <!-- @template-skip --> regions', async () => {
      const content = `# Main Title

<!-- @template-skip -->
## Don't templatize this

This paragraph should also be skipped.
<!-- @end-template-skip -->

## This should be templatized

This paragraph should also be templatized.
`;

      const patterns = [
        {
          context: 'text/markdown#heading',
          selector: 'h1,h2',
          placeholder: 'heading'
        },
        {
          context: 'text/markdown#paragraph',
          selector: 'p',
          placeholder: 'paragraph'
        }
      ];

      const result = await processMarkdownFile('test.md', content, patterns);

      const headingReplacements = result.filter(r => r.placeholder === 'heading');
      const paragraphReplacements = result.filter(r => r.placeholder === 'paragraph');

      assert.equal(headingReplacements.length, 2, 'Should skip h2 in skip region');
      assert.equal(paragraphReplacements.length, 1, 'Should skip p in skip region');

      assert.equal(headingReplacements[0].originalText, 'Main Title');
      assert.equal(headingReplacements[1].originalText, 'This should be templatized');
      assert.equal(paragraphReplacements[0].originalText, 'This paragraph should also be templatized.');
    });
  });
});
