import type { CardProps } from '@mui/material/Card';
import { submitRequest } from 'src/services/submitLLMRequest';
import type { ResponseType } from 'src/types/types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { FormControl, FormLabel } from '@mui/material';
import { Dispatch, SetStateAction, useState } from 'react';

// ----------------------------------------------------------------------

const PROMPT = `<documents> {context} </documents> 
The above documents are provided to assist you in answering the following question. Use only the provided documents to generate a response, if the documents do not provide sufficient information to answer the question respond saying there isn't enough information:

 <question> {question} </question>`;

type Props = CardProps & {
  title?: string;
  subheader?: string;
  setResponse: Dispatch<SetStateAction<ResponseType | undefined>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
};

export function QuestionForm({ title, subheader, sx, setResponse, setLoading, ...other }: Props) {
  const [question, setQuestion] = useState('');
  const [questionError, setQuestionError] = useState(false);

  const handleSubmit = async () => {
    if (!question) {
      setQuestionError(true);
      return;
    }
    setResponse(undefined);
    setLoading(true);
    const response = await submitRequest(question);
    setResponse(response);
    setLoading(false);
  };

  return (
    <Card
      sx={{
        backgroundColor: 'common.white',
        ...sx,
      }}
      {...other}
    >
      <Box display="grid" gap={2} sx={{ p: 3 }}>
        <FormControl>
          <Box display="grid" gap={2}>
            <FormLabel>Question</FormLabel>
            <TextField
              id="question"
              multiline
              rows={3}
              onChange={(e) => {
                setQuestion(e.target.value);
                setQuestionError(!e.target.value);
              }}
              error={questionError}
              helperText={questionError ? 'Question required' : ''}
              required
            />
            <FormLabel>Prompt</FormLabel>
            <TextField
              multiline
              rows={7}
              defaultValue={PROMPT}
              InputProps={{
                readOnly: true,
              }}
            />
            <Button
              size="large"
              type="submit"
              color="secondary"
              variant="outlined"
              onClick={handleSubmit}
            >
              Submit
            </Button>
          </Box>
        </FormControl>
      </Box>
    </Card>
  );
}
