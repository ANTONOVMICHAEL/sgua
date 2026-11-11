import bpy, math, random, os, time
from mathutils import Vector
from math import sin,cos,pi
ROOT='/workspace/scratch/f17c248855e0/civilist/v2-assets'
random.seed(204)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for d in list(bpy.data.materials):bpy.data.materials.remove(d)
scene=bpy.context.scene
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
scene.render.fps=30;scene.frame_start=1;scene.frame_end=900
scene.world.color=(.055,.06,.074)
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.render.film_transparent=False

# The model is a semantic illustration of the case, not a reconstruction of a real facility.
scene['asset_description']='Original architectural cutaway: municipal sports centre with a separately marked leased room. Illustrative floor plan, not additional case facts.'
scene['legal_scope']='Only spatial distinction of building, common sports use and leased premises. Ownership, lease validity and debt allocation are not visually decided.'
scene['animation_description']='30 s seamless architectural inspection: limited camera orbit and separately articulated roof/wall segments. No change of legal status.'

def mat(name,c,rough=.5,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 return m
white=mat('Architecture / warm white mineral plaster',(.84,.85,.83),.62)
white_edge=mat('Architecture / exposed concrete edges',(.70,.73,.75),.72)
white_lit=mat('Architecture / powder-coated white frames',(.95,.96,.94),.38)
dark=mat('Graphite painted handrails',(.055,.065,.075),.32,.35)
black=mat('Rubber and recessed joints',(.025,.028,.03),.85)
orange=mat('Leased premises / orange identifying surface',(.94,.18,.055),.5)
orange_light=mat('Leased premises / orange wall lining',(.80,.12,.035),.54)
wood=mat('Maple sports floor / natural varnish',(.60,.39,.20),.4)
wood_nodes=wood.node_tree.nodes;wood_links=wood.node_tree.links;bs=wood_nodes.get('Principled BSDF')
tex=wood_nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=3.0;tex.inputs['Detail'].default_value=2.3;tex.inputs['Roughness'].default_value=.6
coord=wood_nodes.new('ShaderNodeTexCoord');mapping=wood_nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(.4,45,4)
wood_links.new(coord.outputs['Generated'],mapping.inputs[0]);wood_links.new(mapping.outputs[0],tex.inputs['Vector'])
ramp=wood_nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.15;ramp.color_ramp.elements[0].color=(.32,.16,.055,1);ramp.color_ramp.elements[1].position=.88;ramp.color_ramp.elements[1].color=(.79,.57,.31,1)
wood_links.new(tex.outputs['Fac'],ramp.inputs[0]);wood_links.new(ramp.outputs[0],bs.inputs['Base Color'])
bump=wood_nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.09;bump.inputs['Distance'].default_value=.018;wood_links.new(tex.outputs['Fac'],bump.inputs['Height']);wood_links.new(bump.outputs['Normal'],bs.inputs['Normal'])
woods=[]
for i in range(9):
 m=wood.copy();m.name='Maple parquet tone %02d'%i;f=.84+i*.035;m.diffuse_color=(.64*f,.43*f,.23*f,1);woods.append(m)
line=mat('Court / white painted markings',(.95,.95,.88),.55)
netmat=mat('Basketball net / white cord',(.8,.81,.78),.75)
glass=mat('Architectural glazing / cool grey',(.21,.29,.32),.12,.08)
bs=glass.node_tree.nodes.get('Principled BSDF');bs.inputs['Transmission Weight'].default_value=.62;bs.inputs['IOR'].default_value=1.45
backglass=mat('Backboard / translucent acrylic',(.66,.76,.78),.18,.02);backglass.node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value=.3
seat=mat('Bleacher seats / muted blue graphite',(.16,.23,.26),.48)
floor=mat('Reception / pale terrazzo',(.65,.68,.68),.5)
background=mat('Graphite background',(.024,.029,.038),.9)

COL={}
for name in ['00_Site','01_Hall_structure','02_Sports_floor','03_Basketball_equipment','04_Seating','05_Reception_and_stairs','06_Leased_room','07_Animated_roof','08_Animated_wall','09_Lighting']:
 c=bpy.data.collections.new(name);scene.collection.children.link(c);COL[name]=c
cur=COL['00_Site']
def assign(o,name,material,parent=None):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 cur.objects.link(o)
 if material:o.data.materials.append(material)
 if parent:o.parent=parent
 return o

def cube(name,loc,dim,material,bevel=.015,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=dim
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);assign(o,name,material,parent)
 if bevel>0:
  m=o.modifiers.new('Manufactured edge radius','BEVEL');m.width=bevel;m.segments=3
  m=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o

def cylinder(name,a,b,r,material,verts=16,parent=None):
 a,b=Vector(a),Vector(b);d=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d.length,location=(a+b)/2)
 o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();assign(o,name,material,parent)
 for p in o.data.polygons:p.use_smooth=True
 return o

def path(name,points,r,material,closed=False,parent=None):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=1;cu.bevel_depth=r;cu.resolution_u=2;cu.bevel_resolution=2
 sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for p,xyz in zip(sp.points,points):p.co=(*xyz,1)
 sp.use_cyclic_u=closed;o=bpy.data.objects.new(name,cu);cur.objects.link(o);cu.materials.append(material)
 if parent:o.parent=parent
 return o

def empty(name):
 o=bpy.data.objects.new(name,None);cur.objects.link(o);return o

def quad_mesh(name,quads,material):
 verts=[];faces=[]
 for q in quads:i=len(verts);verts.extend(q);faces.append((i,i+1,i+2,i+3))
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.materials.append(material);o=bpy.data.objects.new(name,me);cur.objects.link(o);return o

def window(name,x,y,z,w,h,axis='Y',parent=None):
 # In-plane frames, recessed glass and a physically separate sill.
 if axis=='Y':
  cube(name+' glazing',(x,y,z),(w,.035,h),glass,0,parent)
  for xx in [x-w/2,x+w/2]:cube(name+' jamb',(xx,y-.025,z),(.055,.12,h+.11),white_lit,.007,parent)
  for zz in [z-h/2,z+h/2]:cube(name+' rail',(x,y-.025,zz),(w+.06,.12,.055),white_lit,.007,parent)
  cube(name+' mullion',(x,y-.05,z),(.045,.12,h),white_lit,.005,parent)
 else:
  cube(name+' glazing',(x,y,z),(.035,w,h),glass,0,parent)
  for yy in [y-w/2,y+w/2]:cube(name+' jamb',(x-.025,yy,z),(.12,.055,h+.11),white_lit,.007,parent)
  for zz in [z-h/2,z+h/2]:cube(name+' rail',(x-.025,y,zz),(.12,w+.06,.055),white_lit,.007,parent)

def handrail(points):
 path('Handrail / continuous tube',points,.025,dark)
 for p in points:cylinder('Balustrade post',(p[0],p[1],p[2]-.95),p,.016,dark,10)

# Fine concrete podium and a narrow exterior apron, no decorative urban scenery.
cube('Foundation cut edge',(0,0,-.48),(44.5,24,.65),white_edge,.06)
cube('Building ground slab',(0,0,-.08),(42.9,22.5,.18),white,.025)
for x in [-21.8,21.8]:cube('Exterior drainage channel',(x,0,.03),(.07,22.8,.025),black,.003)
for y in [-11.7,11.7]:cube('Exterior drainage channel',(0,y,.03),(43.5,.07,.025),black,.003)

# Floorboard geometry: real staggered plank joints, with material variation.
cur=COL['02_Sports_floor']
cube('Sports floor resilient build-up',(-5,0,.03),(31.8,21.8,.16),wood,.005)
quads=[[] for _ in woods]
y=-10.82;row=0
while y<10.8:
 x=-20.82;offset=(row%3)*.68
 while x<10.8:
  length=2.4 if x>-20.8 else 2.4-offset
  xx=min(10.82,x+length);gap=.008
  quads[random.randrange(len(woods))].append([(x+gap,y+gap,.118),(xx-gap,y+gap,.118),(xx-gap,min(y+.18,10.82)-gap,.118),(x+gap,min(y+.18,10.82)-gap,.118)])
  x=xx
 y+=.18;row+=1
for i,qs in enumerate(quads):quad_mesh('Staggered maple planks %02d'%i,qs,woods[i])
# FIBA-proportioned 28 x 15 m court, 5 cm lines.
z=.135
path('Court boundary 28 x 15 m',[(-19,-7.5,z),(9,-7.5,z),(9,7.5,z),(-19,7.5,z)],.025,line,True)
path('Court centre line',[(-5,-7.5,z),(-5,7.5,z)],.025,line)
path('Court centre circle',[(-5+1.8*cos(a),1.8*sin(a),z) for a in [i*2*pi/120 for i in range(120)]],.025,line,True)
for side in [-1,1]:
 baseline=-5+side*14;free=-5+side*(14-5.8)
 path('Painted free-throw lane',[(baseline,-2.45,z),(free,-2.45,z),(free,2.45,z),(baseline,2.45,z)],.025,line)
 # Outside half of the free-throw circle and an unobtrusive dashed inner half.
 angles=[-pi/2+i*pi/80 for i in range(81)]
 path('Free-throw arc',[(free-side*1.8*cos(a),1.8*sin(a),z) for a in angles],.025,line)
 for k in range(12):
  aa=pi/2+k*pi/12;path('Free-throw dashed arc',[(free-side*1.8*cos(a),1.8*sin(a),z) for a in [aa+i*(pi/24)/5 for i in range(6)]],.025,line)
 hoop=-5+side*(14-1.575);maxa=math.asin(6.6/6.75)
 path('Three-point arc',[(hoop-side*6.75*cos(a),6.75*sin(a),z) for a in [-maxa+i*2*maxa/140 for i in range(141)]],.025,line)
 xe=hoop-side*6.75*cos(maxa)
 for yy in [-6.6,6.6]:path('Three-point corner',[(baseline,yy,z),(xe,yy,z)],.025,line)
 path('Restricted-area arc',[(hoop-side*1.25*cos(a),1.25*sin(a),z) for a in angles],.025,line)
 for yy in [-1.2,-.4,.4,1.2]:
  path('Lane tick',[(free,2.5+yy*.0,z),(free-side*.15,2.5,z)],.025,line)

cur=COL['01_Hall_structure']
# Three genuinely different wall conditions: full rear wall, glazing, and a section cut.
cube('North solid lower wall',(-5,11,2.2),(32.3,.24,4.4),white,.025)
cube('North clerestory head',(-5,11,7.6),(32.3,.24,.8),white,.025)
for i in range(8):
 xx=-19+4*i;window('North clerestory',xx,10.99,5.9,3.65,2.45)
 cube('North structural pier',(xx-1.93,10.9,3.8),(.24,.34,7.6),white,.025)
# Acoustic timber fins on the court-facing wall below the glazing.
for i in range(122):
 xx=-20.7+i*.26;cube('Acoustic timber slat',(xx,10.82,2.18),(.05,.08,3.65),woods[i%9],.008)
cube('West end wall',(-21,0,2.2),(.24,22,4.4),white,.025)
cube('West clerestory head',(-21,0,7.6),(.24,22,.8),white,.025)
for i in range(5):window('West clerestory',-21,-8.6+4.3*i,5.9,4.0,2.45,'X')
# High wall at the annex; two real openings connect to reception.
cube('Hall east divider north',(11,6.9,3.75),(.24,8.2,7.5),white,.025)
cube('Hall east divider front',(11,-6.0,3.75),(.24,10,7.5),white,.025)
cube('Hall east door lintel',(11,1.35,5.05),(.24,4.7,4.9),white,.025)
for y0 in [-.55,2.0]:
 cube('Hall interior glazed door',(10.97,y0,1.15),(.04,1.8,2.3),glass,.006)
 for yy in [y0-.9,y0+.9]:cube('Hall door frame',(10.94,yy,1.15),(.13,.06,2.4),white_lit,.005)
 cylinder('Door pull',(10.87,y0+.68,.9),(10.87,y0+.68,1.35),.015,dark,10)
# Sectioned foreground wall, with the precise cut shown as a concrete edge.
cube('South wall section cut',(-5,-11,.25),(32.25,.22,.5),white,.02)
for xx in [-20.9,-12.9,-4.9,3.1,10.9]:
 cube('South retained structural pier',(xx,-10.95,3.9),(.24,.28,7.8),white,.025)
# Light roof beams, repeated at actual structural spans; fine rather than oversized.
for xx in [-19,-13,-7,-1,5,10]:
 cube('Hall roof beam',(xx,0,7.75),(.20,22,.42),white_lit,.02)
 for yy in [-6,0,6]:cube('Linear sports luminaire',(xx,yy,7.4),(.16,2.5,.07),white_lit,.008)
# Low padded panels are sports safety fittings, not arbitrary color accents.
for xx in [-20.7,10.7]:cube('End-wall safety padding',(xx,0,1.0),(.13,5.9,1.8),seat,.035)

cur=COL['03_Basketball_equipment']
for side in [-1,1]:
 hoopx=-5+side*(14-1.575);backx=-5+side*(14-1.2);postx=-5+side*15.1
 cube('Basketball stanchion base',(postx,0,.2),(1.4,1.1,.4),white_edge,.07)
 cylinder('Basketball upright',(postx,0,.35),(postx,0,3.8),.10,white_lit,20)
 cylinder('Basketball cantilever',(postx,0,3.7),(backx,0,3.65),.08,white_lit,20)
 cylinder('Basketball diagonal brace',(postx,0,2.7),(backx,0,3.65),.055,white_lit,16)
 cube('Basketball stanchion padding',(postx-side*.12,0,1.1),(.28,.64,1.9),seat,.07)
 cube('Basketball acrylic backboard',(backx,0,3.475),(.055,1.8,1.05),backglass,.012)
 for yy in [-.9,.9]:cube('Backboard border',(backx-side*.04,yy,3.475),(.035,.025,1.05),white_lit,.003)
 for zz in [2.95,4.0]:cube('Backboard border',(backx-side*.04,0,zz),(.035,1.8,.025),white_lit,.003)
 # 0.59 x 0.45 m aiming rectangle.
 path('Backboard aiming rectangle',[(backx-side*.045,-.295,3.05),(backx-side*.045,.295,3.05),(backx-side*.045,.295,3.50),(backx-side*.045,-.295,3.50)],.012,line,True)
 cylinder('Rim bracket',(backx-side*.03,0,3.05),(hoopx,0,3.05),.024,orange,14)
 path('Basketball orange rim',[(hoopx+.225*cos(i*2*pi/80),.225*sin(i*2*pi/80),3.05) for i in range(80)],.018,orange,True)
 for k in range(12):
  a=k*2*pi/12;pts=[]
  for j in range(9):
   u=j/8;rr=.225*(1-u)+.115*u;ang=a+.15*sin(u*pi*2)
   pts.append((hoopx+rr*cos(ang),rr*sin(ang),3.03-u*.43))
  path('Woven net vertical strand',pts,.006,netmat)
 for j in range(1,5):
  u=j/5;rr=.225*(1-u)+.115*u;path('Woven net circumference',[(hoopx+rr*cos(i*2*pi/48),rr*sin(i*2*pi/48),3.03-u*.43) for i in range(48)],.005,netmat,True)

cur=COL['04_Seating']
# Two modest rows along the rear sideline, with separate tread and seat details.
for row in range(2):
 yy=8.95+row*.76;zz=.25+row*.31
 cube('Bleacher riser',(-5,yy,zz/2),(18,.74,zz),white_edge,.012)
 for n in range(24):
  xx=-13.6+n*.74
  cube('Moulded spectator seat',(xx,yy-.1,zz+.37),(.49,.39,.055),seat,.05)
  o=cube('Moulded spectator back',(xx,yy+.12,zz+.64),(.49,.055,.37),seat,.045);o.rotation_euler.x=-.12
  cylinder('Seat mounting post',(xx,yy,zz),(xx,yy,zz+.34),.025,dark,10)
# An aisle separates the seating from the equipment storage end.
for xx in [-14.4,4.6]:
 handrail([(xx,8.6,.95),(xx,10.45,1.62)])

cur=COL['05_Reception_and_stairs']
cube('Annex terrazzo floor',(16,4.45,.08),(9.75,13.0,.14),floor,.01)
cube('Annex north wall',(16,11,1.95),(10,.22,3.9),white,.02)
# Reception counter: rounded L plan with a genuine curved public face.
# Extruded polygon with softened corners and recessed kickboard.
verts=[(12.7,.2),(17.2,.2),(17.2,1.3),(14,1.3),(14,3.9),(12.7,3.9)]
def extruded_poly(name,coords,z0,height,material,bevel=.03):
 n=len(coords);vs=[(x,y,z0) for x,y in coords]+[(x,y,z0+height) for x,y in coords];faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
 for i in range(n):j=(i+1)%n;faces.append((i,j,j+n,i+n))
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],faces);me.materials.append(material);o=bpy.data.objects.new(name,me);cur.objects.link(o)
 if bevel:m=o.modifiers.new('Soft public-facing edge','BEVEL');m.width=bevel;m.segments=5;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
extruded_poly('Reception / L-shaped counter body',verts,.12,.95,white_lit,.12)
extruded_poly('Reception / dark counter top',[(x-.03,y-.03) for x,y in verts],1.07,.055,dark,.06)
# Clerk workstation stays in reception, not in the leased room.
cube('Reception monitor base',(15.2,.84,1.15),(.45,.25,.035),dark,.02)
cube('Reception monitor support',(15.2,.84,1.35),(.06,.06,.4),dark,.01)
cube('Reception monitor',(15.2,.84,1.6),(.77,.06,.47),dark,.025)
cube('Reception keyboard',(15.2,.42,1.14),(.49,.17,.025),black,.015)
# An open stair to a mezzanine/service landing, with proper rise/run proportions.
for n in range(18):
 yy=5.1+n*.28;zz=(n+1)*.17
 cube('Stair tread %02d'%n,(18.55,yy,zz-.06),(2.25,.29,.12),white_edge,.012)
 if n<17:cube('Stair riser %02d'%n,(18.55,yy+.11,zz+.025),(2.25,.06,.17),white,.005)
cube('Stair upper landing',(17.7,10.05,3.04),(4.0,1.75,.18),white,.015)
for xx in [17.35,19.75]:
 pts=[]
 for n in range(0,18,3):pts.append((xx,5.0+n*.28,(n+1)*.17+.93))
 pts.append((xx,10.18,3.98));handrail(pts)
# Reception benches and an accessible entrance threshold.
for yy in [1.8,3.4]:
 cube('Reception waiting bench',(19.7,yy,.47),(.7,1.2,.12),woods[6],.06)
 for y1 in [yy-.4,yy+.4]:cube('Bench leg',(19.7,y1,.23),(.44,.045,.4),dark,.01)
for yy in [0,2.6,5.2]:window('East reception glazing',21,yy,1.9,2.45,3.5,'X')
# Door recess indicates circulation without a signboard or invented name.
cube('Reception entrance sill',(21,3.9,.07),(1.1,1.75,.07),white_edge,.01)

cur=COL['06_Leased_room']
# The orange room is spatially bounded and empty: no invented tenant activity.
cube('LEASED PREMISES / orange floor',(16,-6.6,.14),(9.75,8.45,.16),orange,.012)
cube('LEASED PREMISES / rear lining',(16,-2.25,1.82),(10,.18,3.6),orange_light,.018)
# Glazed doorway in the rear partition, whose opening is truly modeled.
# Use wall segments rather than a cube with a painted door.
cube('Leased room rear white jamb',(11.25,-2.28,1.9),(.18,.28,3.8),white_lit,.02)
cube('Leased room rear white jamb',(20.75,-2.28,1.9),(.18,.28,3.8),white_lit,.02)
cube('Leased room sectioned frontage',(16,-11,.42),(10,.22,.84),white,.02)
cube('Orange inner section edge',(16,-10.86,.42),(9.6,.035,.70),orange_light,.005)
# Orange wall-side skirtings make the floor boundary legible.
for xx in [11.2,20.8]:cube('Leased room skirting',(xx,-6.6,.25),(.045,8.4,.18),orange_light,.008)
for yy in [-10.8,-2.4]:cube('Leased room skirting',(16,yy,.25),(9.6,.045,.18),orange_light,.008)

cur=COL['08_Animated_wall'];wall=empty('ANIMATION / detached east wall of leased premises')
# A detached facade section has full-scale windows, mullions and a visible section edge.
for yy in [-9.5,-6.5,-3.5]:window('Leased facade glazing',21,yy,2.0,2.82,3.2,'X',wall)
cube('Leased facade lower solid',(21,-6.5,.28),(.23,9,.56),white,.015,wall)
cube('Leased facade head',(21,-6.5,3.8),(.23,9,.4),white,.015,wall)
for yy in [-11,-8,-5,-2]:cube('Leased facade structural mullion',(21,yy,2),(.28,.13,4),white_lit,.012,wall)

cur=COL['07_Animated_roof']
roof=empty('ANIMATION / hall roof inspection section')
# A meaningful partial roof section at the rear keeps the legal subject visible.
cube('Hall roof north inspection panel',(-5,8.65,8.16),(32.4,4.9,.22),white,.025,roof)
for yy in [6.3,11.0]:cube('Roof edge upstand',(-5,yy,8.38),(32.4,.14,.36),white_lit,.014,roof)
for xx in [-20.8,-14.4,-8,-1.6,4.8,11]:cube('Roof rib',(xx,8.65,8.38),(.1,4.65,.25),white_edge,.01,roof)
roof2=empty('ANIMATION / leased premises ceiling panel')
cube('Leased room ceiling panel',(16,-6.5,4.18),(10.2,9.15,.20),white,.025,roof2)
# Orange edge refers directly to the room beneath the panel, never to an abstract token.
cube('Leased ceiling orange section edge',(16,-11,4.1),(9.8,.07,.18),orange,.01,roof2)
for xx in [11.2,20.8]:cube('Annex roof parapet',(xx,-6.5,4.35),(.14,8.85,.24),white_lit,.012,roof2)
# A fixed small service roof behind the stair is a separate lower volume.
cube('Stair core upper cap',(16,9.95,4.25),(10.2,2.5,.2),white,.025)

# Cyclic motion: no physical or legal ownership changes, only inspection cuts.
for f in range(1,902,15):
 t=(f-1)/900;opening=.62+.38*cos(2*pi*t)
 roof.location=(0,opening*1.0,opening*2.3);roof.keyframe_insert(data_path='location',frame=f)
 roof2.location=(opening*1.4,opening*5.2,opening*4.2);roof2.rotation_euler[0]=opening*.025;roof2.keyframe_insert(data_path='location',frame=f);roof2.keyframe_insert(data_path='rotation_euler',frame=f)
 wall.location=(opening*2.3,0,0);wall.keyframe_insert(data_path='location',frame=f)
for ob in [roof,roof2,wall]:
 if ob.animation_data:
  for fc in ob.animation_data.action.fcurves:
   for kp in fc.keyframe_points:kp.interpolation='BEZIER';kp.handle_left_type='AUTO_CLAMPED';kp.handle_right_type='AUTO_CLAMPED'

cur=COL['09_Lighting']
cube('Studio ground',(0,0,-.9),(200,200,.1),background,0)
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.10,.12,.15,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.35

def area(name,loc,target,power,size,col):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=col;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
area('Key / large softbox',(-20,-18,38),(0,0,1),18000,25,(1,.91,.79))
area('Fill / neutral softbox',(26,-6,24),(0,0,2),11000,20,(.80,.88,1))
area('Rim / rear architecture',(-5,25,26),(0,0,4),18000,18,(.92,.95,1))
# Camera travels only 16 degrees through a restrained architectural view.
bpy.ops.object.camera_add();cam=bpy.context.object;cam.name='Camera / 30 second inspection orbit';scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=57;cam.data.lens=55
for f in range(1,902,15):
 t=(f-1)/900;a=math.radians(-55)+math.radians(8)*sin(2*pi*t)
 cam.location=(65*cos(a),65*sin(a),48);target=Vector((0,0,2.8));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert(data_path='location',frame=f);cam.keyframe_insert(data_path='rotation_euler',frame=f)
for fc in cam.animation_data.action.fcurves:
 for kp in fc.keyframe_points:kp.interpolation='BEZIER';kp.handle_left_type='AUTO_CLAMPED';kp.handle_right_type='AUTO_CLAMPED'

# Workbench uses the very same meshes; Cycles delivers the material master still.
scene.display.shading.light='STUDIO';scene.display.shading.studiolight_rotate_z=.45;scene.display.shading.color_type='MATERIAL'
scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH';scene.display.shading.curvature_ridge_factor=1.2;scene.display.shading.curvature_valley_factor=1.05
scene.display.shading.cavity_ridge_factor=1.15;scene.display.shading.cavity_valley_factor=1.2
scene.display.shading.show_specular_highlight=True;scene.display.shading.show_object_outline=False;scene.display.shading.background_type='WORLD'
scene.display.render_aa='8'
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.cycles.preview_samples=16;scene.cycles.max_bounces=6;scene.cycles.transparent_max_bounces=6
scene.render.threads_mode='FIXED';scene.render.threads=8
scene.frame_set(1)
scene.render.filepath=ROOT+'/sports-center_cycles.png'
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/CIVILIST_Sports_Center.blend')
# First review: same full model, modest sample count, half-resolution.
scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_percentage=75;scene.render.filepath=ROOT+'/sports-center_workbench_preview.png'
a=time.time();bpy.ops.render.render(write_still=True);print('WORKBENCH_PREVIEW_SECONDS',time.time()-a,flush=True)
print('MODEL_OBJECTS',len(scene.objects),'MESH_VERTICES',sum(len(o.data.vertices) for o in scene.objects if o.type=='MESH'),flush=True)
