import multer from 'multer';
import { config } from '../config/config';
import { createError } from './errorHandler';

// Configuração do multer para armazenamento local (temporário)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    if (!fs.existsSync('uploads/')) {
      fs.mkdirSync('uploads/', { recursive: true });
    }
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `${file.fieldname}-${uniqueSuffix}.${file.originalname.split('.').pop()}`;
    cb(null, fileName);
  }
});

// Configuração do multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.fileUpload.maxFileSize, // 5MB
    files: 10, // Máximo 10 arquivos por upload
  },
  fileFilter: (req, file, cb) => {
    // Verificar tipo de arquivo
    console.log(file.mimetype)
    if (config.fileUpload.allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(createError('Tipo de arquivo não permitido. Apenas imagens são aceitas.', 400));
    }
  },
});

// Middleware para upload de uma imagem
export const uploadSingle = (fieldName: string = 'image') => {
  return upload.single(fieldName);
};

// Middleware para upload de múltiplas imagens
export const uploadMultiple = (fieldName: string = 'images', maxCount: number = 10) => {
  return upload.array(fieldName, maxCount);
};

// Middleware para upload de campos específicos
export const uploadFields = (fields: { name: string; maxCount: number }[]) => {
  return upload.fields(fields);
};

// Middleware para processar erros de upload
export const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Arquivo muito grande. Tamanho máximo: 5MB',
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Muitos arquivos. Máximo permitido: 10 arquivos',
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Campo de arquivo inesperado',
      });
    }
  }

  next(error);
};

// Função para deletar arquivo local
export const deleteLocalFile = async (filePath: string): Promise<void> => {
  try {
    const fs = await import('fs');
    const path = await import('path');

    const fullPath = path.join(process.cwd(), filePath);
    await fs.promises.unlink(fullPath);
  } catch (error) {
    console.error('Erro ao deletar arquivo local:', error);
    throw error;
  }
};

// Função para validar se o arquivo é uma imagem
export const isValidImageUrl = (url: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
  return imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

// Middleware para validar arquivos obrigatórios
export const requireFile = (fieldName: string) => {
  return (req: any, res: any, next: any) => {
    if (!req.file && !req.files) {
      return res.status(400).json({
        success: false,
        message: `Arquivo ${fieldName} é obrigatório`,
      });
    }
    next();
  };
};

// Middleware para validar múltiplos arquivos obrigatórios
export const requireFiles = (fieldName: string, minCount: number = 1) => {
  return (req: any, res: any, next: any) => {
    const files = req.files?.[fieldName];
    if (!files || (Array.isArray(files) && files.length < minCount)) {
      return res.status(400).json({
        success: false,
        message: `Pelo menos ${minCount} arquivo(s) ${fieldName} é(são) obrigatório(s)`,
      });
    }
    next();
  };
};
