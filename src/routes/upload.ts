import { Router, Request, Response } from 'express';
import { 
  authenticateToken, 
  requireVerification,
  requireClientOrProfessional,
  apiLimiter 
} from '../middlewares';
import { 
  uploadSingle, 
  uploadMultiple, 
  uploadFields,
  handleUploadError,
  requireFile,
  requireFiles 
} from '../middlewares/upload';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

// Aplicar rate limiting e autenticação em todas as rotas
router.use(apiLimiter);
router.use(authenticateToken);
router.use(requireVerification);

// Upload de uma imagem (avatar, logo, etc.)
router.post('/single', 
  requireClientOrProfessional,
  uploadSingle('image'),
  handleUploadError,
  asyncHandler(async (req: any, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado',
      });
    }

    return res.json({
      success: true,
      message: 'Arquivo enviado com sucesso',
      data: {
        file: {
          url: `/uploads/${req.file.filename}`,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype,
          originalName: req.file.originalname,
        },
      },
    });
  })
);

// Upload de múltiplas imagens (portfólio, galeria, etc.)
router.post('/multiple', 
  requireClientOrProfessional,
  uploadMultiple('images', 10),
  handleUploadError,
  asyncHandler(async (req: any, res: Response) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado',
      });
    }

    const files = req.files.map((file: any) => ({
      url: `/uploads/${file.filename}`,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
    }));

    return res.json({
      success: true,
      message: `${files.length} arquivo(s) enviado(s) com sucesso`,
      data: { files },
    });
  })
);

// Upload de campos específicos (perfil profissional)
router.post('/fields', 
  requireClientOrProfessional,
  uploadFields([
    { name: 'avatar', maxCount: 1 },
    { name: 'portfolio', maxCount: 10 },
    { name: 'certifications', maxCount: 5 },
  ]),
  handleUploadError,
  asyncHandler(async (req: any, res: Response) => {
    const uploadedFiles: any = {};

    if (req.files) {
      Object.keys(req.files).forEach(fieldName => {
        const files = req.files[fieldName];
        uploadedFiles[fieldName] = Array.isArray(files) 
          ? files.map((file: any) => ({
              url: `/uploads/${file.filename}`,
              path: file.path,
              size: file.size,
              mimetype: file.mimetype,
              originalName: file.originalname,
            }))
          : {
              url: `/uploads/${files.filename}`,
              path: files.path,
              size: files.size,
              mimetype: files.mimetype,
              originalName: files.originalname,
            };
      });
    }

    res.json({
      success: true,
      message: 'Arquivos enviados com sucesso',
      data: { files: uploadedFiles },
    });
  })
);

// Upload obrigatório de uma imagem
router.post('/required/single', 
  requireClientOrProfessional,
  uploadSingle('image'),
  requireFile('image'),
  handleUploadError,
  asyncHandler(async (req: any, res: Response) => {
    res.json({
      success: true,
      message: 'Arquivo obrigatório enviado com sucesso',
      data: {
        file: {
          url: `/uploads/${req.file.filename}`,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype,
          originalName: req.file.originalname,
        },
      },
    });
  })
);

// Upload obrigatório de múltiplas imagens
router.post('/required/multiple', 
  requireClientOrProfessional,
  uploadMultiple('images', 10),
  requireFiles('images', 2),
  handleUploadError,
  asyncHandler(async (req: any, res: Response) => {
    const files = req.files.map((file: any) => ({
      url: `/uploads/${file.filename}`,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
    }));

    res.json({
      success: true,
      message: `${files.length} arquivo(s) obrigatório(s) enviado(s) com sucesso`,
      data: { files },
    });
  })
);

export default router;
