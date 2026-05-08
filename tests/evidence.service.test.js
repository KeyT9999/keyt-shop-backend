const { __private } = require('../src/services/evidence.service');

describe('evidence.service JSON parsing', () => {
  it('parses Gemini evidence JSON when wrapped in explanatory text', () => {
    const responseText = `Here is the JSON you requested:
{
  "evidence": [
    {
      "title": "Example Study",
      "url": "https://doi.org/10.1000/example",
      "snippet": "The source summarizes relevant evidence.",
      "confidence": 0.82
    }
  ]
}
Hope this helps.`;

    const result = __private.parseEvidenceResponse(responseText, 5);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: 'Example Study',
      url: 'https://doi.org/10.1000/example',
      snippet: 'The source summarizes relevant evidence.',
    });
  });
});
