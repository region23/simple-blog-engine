const { renderMarkdown, extractHeadings, setDebugMode } = require('../../lib/markdownProcessor');

describe('Markdown Processor', () => {
  beforeAll(() => {
    // Отключаем режим отладки для тестов
    setDebugMode(false);
  });

  describe('renderMarkdown with gfmHeadingId', () => {
    it('should add ids to headings', () => {
      const markdown = `# Test Heading
## Sub Heading
### Another Level`;
      
      const html = renderMarkdown(markdown);
      
      // Verify that headings have ids
      expect(html).toContain('<h1 id="test-heading">');
      expect(html).toContain('<h2 id="sub-heading">');
      expect(html).toContain('<h3 id="another-level">');
    });

    it('should handle duplicate headings with unique ids', () => {
      const markdown = `# Test
# Test
## Test`;
      
      const html = renderMarkdown(markdown);
      const headings = extractHeadings(markdown);
      
      // Verify that duplicate headings have unique ids
      expect(headings).toHaveLength(3);
      expect(headings[0].id).not.toBe(headings[1].id);
      expect(headings[1].id).not.toBe(headings[2].id);
    });

    it('should handle special characters in headings', () => {
      const markdown = `# Test & Example
## Code: \`function()\`
### $pecial Ch@rs!`;
      
      const html = renderMarkdown(markdown);
      const headings = extractHeadings(markdown);
      
      // Verify that special characters are handled correctly
      expect(headings[0].id).toBe('test--example');
      expect(headings[1].id).toBe('code-function');
      expect(headings[2].id).toBe('pecial-chrs');
    });

    it('should handle empty headings', () => {
      const markdown = `#
##
###`;
      
      const html = renderMarkdown(markdown);
      const headings = extractHeadings(markdown);
      
      // Verify that empty headings are handled gracefully
      expect(headings).toHaveLength(2); // Only level 2 and 3 are captured
      expect(headings[0].id).toBe('-1');
      expect(headings[1].id).toBe('-2');
      headings.forEach(heading => {
        expect(heading.text).toBe('');
        expect(heading.id).toBeTruthy();
      });
    });
  });
}); 