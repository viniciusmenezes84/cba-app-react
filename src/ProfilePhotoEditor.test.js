import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import ProfilePhotoEditor from './ProfilePhotoEditor';
import {portalPost,uploadProfilePhoto} from './cbaApi';
import {prepareProfilePhoto,drawProfileCrop,encodeProfilePhoto} from './profilePhoto';
jest.mock('./cbaApi',()=>({portalPost:jest.fn(),uploadProfilePhoto:jest.fn()}));
jest.mock('./profilePhoto',()=>({prepareProfilePhoto:jest.fn(),drawProfileCrop:jest.fn(),encodeProfilePhoto:jest.fn()}));
beforeEach(()=>{jest.clearAllMocks();prepareProfilePhoto.mockResolvedValue({image:{},dispose:jest.fn()});encodeProfilePhoto.mockResolvedValue('compressed-jpeg');});
test('falha mantém o recorte para nova tentativa; sucesso atualiza somente após confirmação do servidor',async()=>{
 const onSaved=jest.fn(),onEditingChange=jest.fn();uploadProfilePhoto.mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValueOnce({profile:{photoUrl:'https://photo.test/new.jpg'}});
 render(<ProfilePhotoEditor photoUrl="https://photo.test/old.jpg" onSaved={onSaved} onEditingChange={onEditingChange}/>);
 fireEvent.click(screen.getByText('Alterar foto'));fireEvent.change(screen.getByLabelText('Arquivo da foto'),{target:{files:[new File(['test'],'photo.jpg',{type:'image/jpeg'})]}});
 await screen.findByRole('img',{name:'Prévia do enquadramento da foto'});
 fireEvent.change(screen.getByLabelText('Zoom'),{target:{value:'2'}});
 fireEvent.click(screen.getByText('Salvar foto'));
 expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão');expect(onSaved).not.toHaveBeenCalled();
 expect(screen.getByLabelText('Zoom')).toHaveValue('2');
 fireEvent.click(screen.getByText('Salvar foto'));
 await waitFor(()=>expect(onSaved).toHaveBeenCalledWith({photoUrl:'https://photo.test/new.jpg'}));
 expect(uploadProfilePhoto).toHaveBeenCalledWith('compressed-jpeg',expect.objectContaining({signal:expect.any(AbortSignal),onProgress:expect.any(Function)}));
 expect(onEditingChange).toHaveBeenLastCalledWith(false);
});
test('remoção exige confirmação e não envia id de outro atleta',async()=>{
 const onSaved=jest.fn();portalPost.mockResolvedValue({profile:{photoUrl:''}});
 render(<ProfilePhotoEditor photoUrl="https://photo.test/old.jpg" onSaved={onSaved}/>);
 fireEvent.click(screen.getByText('Alterar foto'));fireEvent.click(screen.getByText('Remover foto'));expect(portalPost).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Confirmar remoção'));
 await waitFor(()=>expect(onSaved).toHaveBeenCalledWith({photoUrl:''}));
 expect(portalPost).toHaveBeenCalledWith('removeMyPhoto',{},expect.objectContaining({signal:expect.any(AbortSignal)}));
});
