import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import AthleteCardModal from './AthleteCardModal';
jest.mock('./athleteCardCanvas',()=>({CARD_WIDTH:1080,CARD_HEIGHT:1350,STORY_HEIGHT:1920,drawAthleteCard:jest.fn(),drawAthleteStory:jest.fn(),drawMyRoundCard:jest.fn(),drawMyRoundStory:jest.fn()}));
test.each([null, { date: '2026-10-18', pts: 0, reb: 0, ast: 0, blk: 0 }])('foto lenta não libera download automaticamente e chegada tardia atualiza o arquivo compartilhado (%j)',async(round)=>{
 jest.useFakeTimers();
 const oldImage=global.Image,oldShare=Object.getOwnPropertyDescriptor(navigator,'share'),oldCanShare=Object.getOwnPropertyDescriptor(navigator,'canShare');
 const images=[];global.Image=class {constructor(){images.push(this)}};
 Object.defineProperty(navigator,'share',{configurable:true,value:jest.fn().mockResolvedValue()});
 Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
 const toBlob=jest.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob(['png'],{type:'image/png'})));
 try {
  render(<AthleteCardModal athlete={{name:'Atleta',fotoUrl:'https://photo.test/own.jpg'}} year="2026" round={round} onClose={jest.fn()}/>);
  expect(images[0].crossOrigin).toBe('anonymous');
  expect(screen.getByRole('button',{name:'Baixar PNG'})).toBeDisabled();
  expect(toBlob).not.toHaveBeenCalled();
  act(()=>jest.advanceTimersByTime(7000));
  expect(screen.getByRole('button',{name:'Baixar PNG'})).toBeDisabled();
  fireEvent.click(screen.getByText('Continuar com a inicial'));
  fireEvent.click(screen.getByRole('button',{name:'Compartilhar no WhatsApp'}));
  const firstButton = await screen.findByText('Abrir seletor de aplicativos');
  await act(async()=>{fireEvent.click(firstButton);});
  const first=navigator.share.mock.calls[0][0].files[0];
  act(()=>images[0].onload());
  await waitFor(()=>expect(toBlob).toHaveBeenCalledTimes(2));
  const secondButton = await screen.findByText('Abrir seletor de aplicativos');
  await act(async()=>{fireEvent.click(secondButton);});
  expect(navigator.share.mock.calls[1][0].files[0]).not.toBe(first);
  expect(screen.queryByText('Tentar carregar foto novamente')).not.toBeInTheDocument();
 } finally {
  toBlob.mockRestore();global.Image=oldImage;jest.useRealTimers();
  if(oldShare)Object.defineProperty(navigator,'share',oldShare);else delete navigator.share;
  if(oldCanShare)Object.defineProperty(navigator,'canShare',oldCanShare);else delete navigator.canShare;
 }
});
