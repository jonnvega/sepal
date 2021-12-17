import {Button} from 'widget/button'
import {ButtonGroup} from 'widget/buttonGroup'
import {Scrollable, ScrollableContainer} from 'widget/scrollable'
import {msg} from 'translate'
import Keybinding from 'widget/keybinding'
import React from 'react'
import Tagline from './tagline'
import Title from './title'
import image_01 from './intro/bhutan.jpg'
import image_02 from './intro/senegal.jpg'
import image_03 from './intro/namibia.jpg'
import image_04 from './intro/terminal.jpg'
import image_gee from './intro/tools/gee.png'
import image_jupyter from './intro/tools/jupyter.png'
import image_rstudio from './intro/tools/rstudio.png'
import image_shiny from './intro/tools/shiny.jpg'
import partner_ec from './intro/partners/ec.png'
import partner_esa from './intro/partners/esa.png'
import partner_eth from './intro/partners/eth.png'
import partner_formin from './intro/partners/formin.png'
import partner_germany from './intro/partners/germany.png'
import partner_gfoi from './intro/partners/gfoi.png'
import partner_google from './intro/partners/google.png'
import partner_jaxa from './intro/partners/jaxa.png'
import partner_jica from './intro/partners/jica.png'
import partner_kfw from './intro/partners/kfw.png'
import partner_nasa from './intro/partners/nasa.png'
import partner_nicfi from './intro/partners/nicfi.png'
import partner_openforis from './intro/partners/openforis.png'
import partner_sc from './intro/partners/sc.png'
import partner_servir from './intro/partners/servir.png'
import partner_sig from './intro/partners/sig.png'
import partner_wageningen from './intro/partners/wageningen.png'
import styles from './intro.module.css'

const signupUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSci4hopXNtMOQKJzsUybaJETrAPQp8j6TCqycSBQ0XO37jBwA/viewform?c=0&w=1'

const Intro = ({onLaunch}) =>
    <ScrollableContainer>
        <Scrollable className={styles.intro}>
            <Main onLaunch={onLaunch}/>
            <Info/>
            <Footer/>
        </Scrollable>
    </ScrollableContainer>

const Main = ({onLaunch}) =>
    <Keybinding keymap={{'Enter': onLaunch, 'Escape': onLaunch}}>
        <div id='main' className={styles.main}>
            <Title className={styles.title}/>
            <Tagline className={styles.tagline}/>
            <ButtonGroup layout='horizontal-nowrap' spacing='loose'>
                <Button
                    look='default'
                    size='x-large'
                    air='more'
                    label={msg('landing.signup')}
                    tabIndex={1}
                    linkUrl={signupUrl}
                    linkTarget='_self'
                    additionalClassName={styles.button}
                />
                <Button
                    type='submit'
                    look='apply'
                    size='x-large'
                    air='more'
                    label={msg('landing.launch')}
                    tabIndex={2}
                    onClick={onLaunch}
                    additionalClassName={styles.button}
                />
            </ButtonGroup>
            <ButtonGroup layout='horizontal-nowrap' alignment='center'>
                <Button
                    look='transparent'
                    shape='circle'
                    size='xx-large'
                    icon='chevron-down'
                    onClick={scrollToInfo}
                    additionalClassName={styles.pulse}
                />
            </ButtonGroup>
        </div>
    </Keybinding>

const Block = ({theme, image, images, imagePosition, textKey, type}) =>
    <div className={[styles.block, styles[theme], styles[imagePosition], styles[type]].join(' ')}>
        <div className={styles.image}>
            {image ? <img src={image} alt=""/> : null}
            {images ? images.map((image, index) => <img key={index} src={image} alt=""/>) : null}
        </div>
        <div className={styles.text}>
            <div className={styles.title}>{msg(`${textKey}.title`)}</div>
            <div className={styles.description}>{msg(`${textKey}.description`, {}, ' ')}</div>
        </div>
    </div>

const Info = () =>
    <div id='info'>
        <Block
            type='feature'
            theme='dark'
            image={image_01}
            imagePosition='left'
            textKey='landing.intro.easeOfUse'
        />
        <Block
            type='feature'
            theme='dark'
            image={image_02}
            imagePosition='right'
            textKey='landing.intro.computingPower'
        />
        <Block
            type='tool'
            theme='light'
            image={image_gee}
            imagePosition='left'
            textKey='landing.intro.googleEarthEngine'
        />
        <Block
            type='tool'
            theme='light'
            image={image_jupyter}
            imagePosition='right'
            textKey='landing.intro.jupyterNotebook'
        />
        <Block
            type='tool'
            theme='light'
            image={image_shiny}
            imagePosition='left'
            textKey='landing.intro.shiny'
        />
        <Block
            type='tool'
            theme='light'
            image={image_rstudio}
            imagePosition='right'
            textKey='landing.intro.rstudio'
        />
        <Block
            type='feature'
            theme='dark'
            image={image_03}
            imagePosition='left'
            textKey='landing.intro.integrations'
        />
        <Block
            type='feature'
            theme='dark'
            image={image_04}
            imagePosition='right'
            textKey='landing.intro.powerUsers'
        />
        <Block
            type='about'
            theme='light'
            images={[partner_openforis, partner_nicfi]}
            imagePosition='right'
            textKey='landing.intro.about'
        />
        <Block
            type='partners'
            theme='light'
            images={[
                partner_ec, partner_esa,
                partner_eth, partner_formin,
                partner_germany, partner_gfoi,
                partner_google, partner_jaxa,
                partner_jica, partner_kfw,
                partner_nasa, partner_sc,
                partner_servir, partner_sig,
                partner_wageningen
            ]}
            imagePosition='center'
            textKey='landing.intro.partners'
        />
    </div>

const Footer = () =>
    <ButtonGroup
        className={styles.footer}
        layout='horizontal-nowrap'
        alignment='spaced'>
        <Button
            chromeless
            look='transparent'
            shape='pill'
            size='x-large'
            linkUrl='http://www.openforis.org'
            linkTarget='openforis'
            label='Openforis'>
        </Button>
        <Button
            chromeless
            look='transparent'
            shape='pill'
            size='x-large'
            linkUrl='https://github.com/openforis/sepal'
            linkTarget='github-project'
            label='GitHub'>
        </Button>
        <Button
            chromeless
            look='transparent'
            shape='pill'
            size='x-large'
            linkUrl='/privacy-policy'
            linkTarget='privacy-policy'
            label={msg('landing.privacyPolicy')}>
        </Button>
    </ButtonGroup>

const scrollToInfo = () =>
    document.getElementById('info').scrollIntoView({
        behavior: 'smooth'
    })

export default Intro
